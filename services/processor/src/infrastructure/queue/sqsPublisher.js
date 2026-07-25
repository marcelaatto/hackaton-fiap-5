const { SendMessageCommand } = require('@aws-sdk/client-sqs');
const { createSQSClient, logger } = require('@hackaton/shared');
const env = require('../../config/env');

const sqs = createSQSClient();

/**
 * Publica um evento de falha definitiva na fila video-failures.
 * O Notification Service consome essa fila para alertar o usuário.
 *
 * Decisão arquitetural: separar a fila de failures da DLQ.
 * - DLQ: mecanismo de infraestrutura (mensagens que excederam maxReceiveCount)
 * - video-failures: evento de negócio (usuário precisa ser notificado)
 */
async function publishFailure(videoId, userId, userEmail, errorMessage) {
  const payload = {
    videoId,
    userId,
    userEmail,
    errorMessage,
    timestamp: new Date().toISOString(),
  };

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: env.SQS_FAILURES_QUEUE_URL,
      MessageBody: JSON.stringify(payload),
    })
  );

  logger.info('Evento de falha publicado em video-failures', { videoId, userId });
}

module.exports = { publishFailure };
