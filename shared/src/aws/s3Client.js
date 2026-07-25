const { S3Client } = require('@aws-sdk/client-s3');

/**
 * Cria um cliente S3 configurado para AWS real ou LocalStack.
 * A decisão é feita por variável de ambiente:
 *   - AWS_ENDPOINT_URL definida  → LocalStack (desenvolvimento local)
 *   - AWS_ENDPOINT_URL indefinida → AWS real (produção)
 */
function createS3Client() {
  const config = {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    },
  };

  if (process.env.AWS_ENDPOINT_URL) {
    config.endpoint = process.env.AWS_ENDPOINT_URL;
    // Necessário para LocalStack: usa path-style URLs (s3://host/bucket/key)
    config.forcePathStyle = true;
  }

  return new S3Client(config);
}

module.exports = { createS3Client };
