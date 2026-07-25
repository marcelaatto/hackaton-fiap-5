require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3001,

  // Banco de dados
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
  DB_NAME: process.env.DB_NAME || 'hackaton',
  DB_USER: process.env.DB_USER || 'hackaton',
  DB_PASS: process.env.DB_PASS || 'hackaton',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  MAX_CONCURRENT_VIDEOS: parseInt(process.env.MAX_CONCURRENT_VIDEOS, 10) || 3,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // AWS / S3
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL || null,
  S3_BUCKET_VIDEOS: process.env.S3_BUCKET_VIDEOS || 'hackaton-videos',
  S3_BUCKET_ZIPS: process.env.S3_BUCKET_ZIPS || 'hackaton-zips',
  PRESIGNED_URL_EXPIRES: parseInt(process.env.PRESIGNED_URL_EXPIRES, 10) || 300, // 5 minutos

  // SQS
  SQS_QUEUE_URL: process.env.SQS_QUEUE_URL,

  // Upload
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50,
};
