const winston = require('winston');

const { combine, timestamp, json, colorize, simple } = winston.format;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), json()),
  defaultMeta: { service: process.env.SERVICE_NAME || 'app' },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'development'
          ? combine(colorize(), simple())
          : combine(timestamp(), json()),
    }),
  ],
});

module.exports = logger;
