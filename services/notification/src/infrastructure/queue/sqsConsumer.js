const {
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require('@aws-sdk/client-sqs');
const { createSQSClient, logger } = require('@hackaton/shared');
const env = require('../../config/env');

const sqs = createSQSClient();

async function receiveMessages() {
  const command = new ReceiveMessageCommand({
    QueueUrl: env.SQS_FAILURES_QUEUE_URL,
    MaxNumberOfMessages: 10, // notificações são leves — pode processar várias por ciclo
    WaitTimeSeconds: env.SQS_WAIT_TIME_SECONDS,
  });

  const response = await sqs.send(command);
  return response.Messages || [];
}

async function deleteMessage(receiptHandle) {
  await sqs.send(
    new DeleteMessageCommand({
      QueueUrl: env.SQS_FAILURES_QUEUE_URL,
      ReceiptHandle: receiptHandle,
    })
  );
  logger.debug('Mensagem de falha deletada do SQS');
}

module.exports = { receiveMessages, deleteMessage };
