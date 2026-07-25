const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { createS3Client, logger } = require('@hackaton/shared');
const { pipeline } = require('stream/promises');
const fs = require('fs');
const env = require('../../config/env');

const s3 = createS3Client();

/**
 * Baixa um vídeo do S3 e salva no caminho especificado.
 * Usa stream para evitar carregar o arquivo inteiro em memória.
 */
async function downloadVideo(s3Key, destPath) {
  logger.debug('Baixando vídeo do S3', { s3Key, destPath });

  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_VIDEOS,
    Key: s3Key,
  });

  const response = await s3.send(command);
  const writeStream = fs.createWriteStream(destPath);
  await pipeline(response.Body, writeStream);

  logger.debug('Download concluído', { s3Key });
}

module.exports = { downloadVideo };
