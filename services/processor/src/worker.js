require('dotenv').config();
process.env.SERVICE_NAME = 'processor';

const { logger } = require('@hackaton/shared');
const videoConsumer = require('./consumers/videoConsumer');
const { sequelize } = require('./database');
const env = require('./config/env');

async function start() {
  logger.info('Processor service iniciando...', { env: env.NODE_ENV });

  if (!env.SQS_QUEUE_URL) {
    throw new Error('SQS_QUEUE_URL não configurada');
  }

  await sequelize.authenticate();
  logger.info('Banco de dados conectado');

  // Encerramento gracioso: para o loop ao receber sinal do Docker/Kubernetes
  process.on('SIGTERM', () => {
    logger.info('SIGTERM recebido — encerrando consumer...');
    videoConsumer.stop();
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT recebido — encerrando consumer...');
    videoConsumer.stop();
    process.exit(0);
  });

  await videoConsumer.start();
}

start().catch((err) => {
  logger.error('Falha ao iniciar o Processor', { error: err.message });
  process.exit(1);
});
