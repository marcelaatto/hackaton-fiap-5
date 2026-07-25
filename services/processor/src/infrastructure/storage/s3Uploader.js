const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { createS3Client, logger } = require('@hackaton/shared');
const fs = require('fs');
const env = require('../../config/env');

const s3 = createS3Client();

/**
 * Faz upload de um arquivo ZIP para o S3.
 * Usa stream para não carregar o arquivo inteiro em memória.
 */
async function uploadZip(s3Key, filePath) {
  logger.debug('Fazendo upload do ZIP para S3', { s3Key, filePath });

  const fileStream = fs.createReadStream(filePath);

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_ZIPS,
    Key: s3Key,
    Body: fileStream,
    ContentType: 'application/zip',
  });

  await s3.send(command);
  logger.debug('Upload concluído', { s3Key });
}

module.exports = { uploadZip };
