require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',

  // AWS / SQS
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL || null,
  SQS_FAILURES_QUEUE_URL: process.env.SQS_FAILURES_QUEUE_URL,
  SQS_WAIT_TIME_SECONDS: parseInt(process.env.SQS_WAIT_TIME_SECONDS, 10) || 20,

  // SMTP / MailHog
  SMTP_HOST: process.env.SMTP_HOST || 'localhost',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 1025,
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@hackaton.local',
};
