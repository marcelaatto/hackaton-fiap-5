require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./database');
const env = require('./config/env');
const { logger } = require('@hackaton/shared');

process.env.SERVICE_NAME = 'api';

async function start() {
  // Aguarda conexão com o banco de dados
  await sequelize.authenticate();
  logger.info('Conexão com o banco de dados estabelecida');

  app.listen(env.PORT, () => {
    logger.info(`API service rodando na porta ${env.PORT}`, {
      port: env.PORT,
      env: env.NODE_ENV,
    });
  });
}

start().catch((err) => {
  logger.error('Falha ao iniciar o serviço API', { error: err.message });
  process.exit(1);
});
