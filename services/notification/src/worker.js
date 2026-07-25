require('dotenv').config();
process.env.SERVICE_NAME = 'notification';

const { logger } = require('@hackaton/shared');
const failureConsumer = require('./consumers/failureConsumer');
const env = require('./config/env');

async function start() {
  logger.info('Notification service iniciando...', { env: env.NODE_ENV });

  if (!env.SQS_FAILURES_QUEUE_URL) {
    throw new Error('SQS_FAILURES_QUEUE_URL não configurada');
  }

  process.on('SIGTERM', () => {
    logger.info('SIGTERM recebido — encerrando consumer...');
    failureConsumer.stop();
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT recebido — encerrando consumer...');
    failureConsumer.stop();
    process.exit(0);
  });

  await failureConsumer.start();
}

start().catch((err) => {
  logger.error('Falha ao iniciar o Notification service', { error: err.message });
  process.exit(1);
});
