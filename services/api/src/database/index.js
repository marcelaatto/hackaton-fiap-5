const { Sequelize } = require('sequelize');
const env = require('../config/env');
const { logger } = require('@hackaton/shared');

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASS, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'postgres',
  logging: env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Carrega models e define associações
const User = require('../entities/User')(sequelize);
const Video = require('../entities/Video')(sequelize);

const models = { User, Video, sequelize, Sequelize };

// Configura associações
User.hasMany(Video, { foreignKey: 'user_id', as: 'videos' });
Video.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = models;
