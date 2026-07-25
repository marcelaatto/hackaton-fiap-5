const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createS3Client } = require('@hackaton/shared');
const env = require('../../config/env');

const s3Client = createS3Client();

/**
 * Quando a API roda dentro do Docker, a URL pré-assinada é gerada com o
 * hostname interno "localstack". Esta função substitui pelo hostname público
 * (configurado em AWS_ENDPOINT_URL_PUBLIC) para que o cliente consiga acessar.
 */
function toPublicUrl(url) {
  const internal = process.env.AWS_ENDPOINT_URL;
  const external = process.env.AWS_ENDPOINT_URL_PUBLIC;
  if (internal && external && url.startsWith(internal)) {
    return url.replace(internal, external);
  }
  return url;
}

/**
 * Gera uma URL pré-assinada para upload direto ao S3 (método PUT).
 * O vídeo vai do cliente direto para o S3, sem passar pela API.
 */
async function generateUploadUrl(s3Key) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_VIDEOS,
    Key: s3Key,
    ContentType: 'video/mp4',
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: env.PRESIGNED_URL_EXPIRES,
  });

  return { url: toPublicUrl(url), expiresIn: env.PRESIGNED_URL_EXPIRES };
}

/**
 * Gera uma URL pré-assinada para download do ZIP gerado.
 */
async function generateDownloadUrl(s3Key) {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_ZIPS,
    Key: s3Key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hora
  return { url: toPublicUrl(url), expiresIn: 3600 };
}

module.exports = { generateUploadUrl, generateDownloadUrl };
