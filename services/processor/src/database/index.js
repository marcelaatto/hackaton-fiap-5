const { Sequelize } = require('sequelize');
const env = require('../config/env');

// O Processor só precisa de acesso ao banco para atualizar status de vídeos.
// Migrations são responsabilidade exclusiva da API.
const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASS, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'postgres',
  logging: false,
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
});

const Video = require('../entities/Video')(sequelize);

module.exports = { sequelize, Video };
