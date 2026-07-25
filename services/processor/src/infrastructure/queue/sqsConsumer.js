const {
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require('@aws-sdk/client-sqs');
const { createSQSClient, logger } = require('@hackaton/shared');
const env = require('../../config/env');

const sqs = createSQSClient();

/**
 * Aguarda e retorna mensagens da fila SQS via long polling.
 * WaitTimeSeconds=20 reduz custo e latência vs. short polling.
 */
async function receiveMessages() {
  const command = new ReceiveMessageCommand({
    QueueUrl: env.SQS_QUEUE_URL,
    MaxNumberOfMessages: env.SQS_MAX_MESSAGES,
    WaitTimeSeconds: env.SQS_WAIT_TIME_SECONDS,
    // ApproximateReceiveCount é necessário para detectar a última tentativa
    AttributeNames: ['ApproximateReceiveCount'],
  });

  const response = await sqs.send(command);
  return response.Messages || [];
}

/**
 * Remove a mensagem da fila após processamento bem-sucedido.
 * Não chamar em caso de falha — SQS fará o retry automaticamente.
 */
async function deleteMessage(receiptHandle) {
  await sqs.send(
    new DeleteMessageCommand({
      QueueUrl: env.SQS_QUEUE_URL,
      ReceiptHandle: receiptHandle,
    })
  );
  logger.debug('Mensagem deletada do SQS');
}

module.exports = { receiveMessages, deleteMessage };
