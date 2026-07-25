require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Banco de dados
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
  DB_NAME: process.env.DB_NAME || 'hackaton',
  DB_USER: process.env.DB_USER || 'hackaton',
  DB_PASS: process.env.DB_PASS || 'hackaton',

  // AWS / S3
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL || null,
  S3_BUCKET_VIDEOS: process.env.S3_BUCKET_VIDEOS || 'hackaton-videos',
  S3_BUCKET_ZIPS: process.env.S3_BUCKET_ZIPS || 'hackaton-zips',

  // SQS
  SQS_QUEUE_URL: process.env.SQS_QUEUE_URL,
  SQS_FAILURES_QUEUE_URL: process.env.SQS_FAILURES_QUEUE_URL,
  SQS_WAIT_TIME_SECONDS: parseInt(process.env.SQS_WAIT_TIME_SECONDS, 10) || 20,
  SQS_MAX_MESSAGES: parseInt(process.env.SQS_MAX_MESSAGES, 10) || 1,

  // FFmpeg
  FFMPEG_FRAMES_PER_SECOND: parseInt(process.env.FFMPEG_FRAMES_PER_SECOND, 10) || 1,
};
