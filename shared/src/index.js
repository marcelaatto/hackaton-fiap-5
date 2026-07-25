const logger = require('./logger');
const AppError = require('./errors/AppError');
const { createS3Client } = require('./aws/s3Client');
const { createSQSClient } = require('./aws/sqsClient');

module.exports = {
  logger,
  AppError,
  createS3Client,
  createSQSClient,
};
