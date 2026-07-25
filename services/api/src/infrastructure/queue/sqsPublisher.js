const { SendMessageCommand } = require('@aws-sdk/client-sqs');
const { createSQSClient, logger } = require('@hackaton/shared');
const env = require('../../config/env');

// Cliente instanciado uma vez (singleton por processo)
const sqsClient = createSQSClient();

/**
 * Publica uma mensagem de processamento de vídeo na fila SQS.
 */
async function publishVideoJob(videoId, userId, s3Key, userEmail) {
  const payload = {
    videoId,
    userId,
    s3Key,
    userEmail,
    timestamp: new Date().toISOString(),
  };

  const command = new SendMessageCommand({
    QueueUrl: env.SQS_QUEUE_URL,
    MessageBody: JSON.stringify(payload),
  });

  const result = await sqsClient.send(command);
  logger.info('Mensagem publicada no SQS', { videoId, messageId: result.MessageId });
  return result;
}

module.exports = { publishVideoJob };
