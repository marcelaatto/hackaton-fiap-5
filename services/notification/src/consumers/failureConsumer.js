const sqsConsumer = require('../infrastructure/queue/sqsConsumer');
const notificationService = require('../services/notificationService');
const { logger } = require('@hackaton/shared');
const env = require('../config/env');

let running = true;

/**
 * Loop de consumo da fila video-failures.
 * Diferente do Processor, processa várias mensagens por ciclo pois
 * enviar e-mail é rápido e não bloqueia o event loop significativamente.
 */
async function start() {
  logger.info('Failure consumer iniciado', { queueUrl: env.SQS_FAILURES_QUEUE_URL });

  while (running) {
    try {
      const messages = await sqsConsumer.receiveMessages();

      for (const message of messages) {
        if (!running) break;
        await handleMessage(message);
      }
    } catch (err) {
      logger.error('Erro no loop do failure consumer', { error: err.message });
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  logger.info('Failure consumer encerrado');
}

async function handleMessage(message) {
  let videoId = '(desconhecido)';
  try {
    const payload = JSON.parse(message.Body);
    videoId = payload.videoId;

    logger.info('Notificação de falha recebida', { videoId, to: payload.userEmail });

    await notificationService.sendFailureNotification(payload);
    await sqsConsumer.deleteMessage(message.ReceiptHandle);

    logger.info('Notificação processada com sucesso', { videoId });
  } catch (err) {
    // Não deleta a mensagem — SQS vai retentar a entrega
    logger.error('Erro ao enviar notificação', {
      videoId,
      error: err.message,
      messageId: message.MessageId,
    });
  }
}

function stop() {
  running = false;
}

module.exports = { start, stop };
