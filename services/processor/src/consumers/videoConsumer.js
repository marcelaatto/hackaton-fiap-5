const sqsConsumer = require('../infrastructure/queue/sqsConsumer');
const processorService = require('../services/processorService');
const { logger } = require('@hackaton/shared');
const env = require('../config/env');

let running = true;

/**
 * Loop principal de consumo da fila SQS.
 * Processa uma mensagem por vez para controle preciso de erros e retries.
 */
async function start() {
  logger.info('Consumer SQS iniciado', { queueUrl: env.SQS_QUEUE_URL });

  while (running) {
    try {
      const messages = await sqsConsumer.receiveMessages();

      if (messages.length === 0) {
        // Long polling expirou sem mensagens — reinicia o loop normalmente
        continue;
      }

      for (const message of messages) {
        if (!running) break;

        logger.info('Mensagem recebida', { messageId: message.MessageId });

        const shouldDelete = await processorService.processVideo(message);

        if (shouldDelete) {
          await sqsConsumer.deleteMessage(message.ReceiptHandle);
        } else {
          logger.warn('Mensagem mantida na fila para retry do SQS', {
            messageId: message.MessageId,
          });
        }
      }
    } catch (err) {
      // Erros inesperados no loop (ex: falha de rede ao chamar SQS)
      logger.error('Erro inesperado no loop do consumer', { error: err.message });
      // Pausa de 5s para evitar loop acelerado em falhas persistentes
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  logger.info('Consumer SQS encerrado');
}

function stop() {
  running = false;
}

module.exports = { start, stop };
