const { SQSClient } = require('@aws-sdk/client-sqs');

/**
 * Cria um cliente SQS configurado para AWS real ou LocalStack.
 * A decisão é feita por variável de ambiente:
 *   - AWS_ENDPOINT_URL definida  → LocalStack (desenvolvimento local)
 *   - AWS_ENDPOINT_URL indefinida → AWS real (produção)
 */
function createSQSClient() {
  const config = {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    },
  };

  if (process.env.AWS_ENDPOINT_URL) {
    config.endpoint = process.env.AWS_ENDPOINT_URL;
  }

  return new SQSClient(config);
}

module.exports = { createSQSClient };
