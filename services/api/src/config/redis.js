const Redis = require('ioredis');
const env = require('./env');
const { logger } = require('@hackaton/shared');

let client = null;

function getRedisClient() {
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    });

    client.on('connect', () => logger.info('Redis conectado'));
    client.on('error', (err) => logger.error('Redis error', { error: err.message }));
  }
  return client;
}

module.exports = { getRedisClient };
