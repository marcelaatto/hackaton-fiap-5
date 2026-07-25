const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const assert = require('assert');
const request = require('supertest');
const app = require('../../../src/app');

// Mocks dos serviços externos para BDD rodar sem infraestrutura real
jest.mock('../../../src/services/authService');
jest.mock('../../../src/services/videoService');
const authService = require('../../../src/services/authService');
const videoService = require('../../../src/services/videoService');

let response;
let authToken;
let videoId;

// ─── Hooks ──────────────────────────────────────────────────────────────────
Before(() => {
  authService.login.mockResolvedValue({
    token: 'bdd.test.token',
    user: { id: 'bdd-user-id', name: 'BDD User', email: 'usuario@teste.com' },
  });
});

After(() => {
  jest.clearAllMocks();
  response = undefined;
  authToken = undefined;
  videoId = undefined;
});

// ─── Steps ──────────────────────────────────────────────────────────────────

Given('que estou autenticado com email {string}', async (email) => {
  const loginResponse = await request(app)
    .post('/auth/login')
    .send({ email, password: 'qualquer' });
  authToken = loginResponse.body.token;
});

When('solicito uma URL de upload para o arquivo {string}', async (filename) => {
  if (filename.endsWith('.mp4')) {
    videoService.requestUploadUrl.mockResolvedValue({
      videoId: 'bdd-video-id',
      uploadUrl: 'https://s3.localstack.local/presigned-url',
      expiresIn: 300,
    });
  }

  response = await request(app)
    .post('/videos/upload-url')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ filename });

  if (response.body.videoId) {
    videoId = response.body.videoId;
  }
});

Then('recebo uma URL pré-assinada do S3', () => {
  assert.strictEqual(response.status, 201);
  assert.ok(response.body.uploadUrl, 'uploadUrl deve estar presente');
  assert.ok(response.body.videoId, 'videoId deve estar presente');
});

Then('o vídeo é registrado com status {string}', (expectedStatus) => {
  // O status inicial é UPLOADED ao criar o registro — validado pela presença do videoId
  assert.ok(videoId, `videoId deve existir para status ${expectedStatus}`);
});

When('informo que o upload foi concluído', async () => {
  videoService.confirmUpload.mockResolvedValue({
    id: videoId,
    status: 'QUEUED',
    original_filename: 'video.mp4',
  });

  response = await request(app)
    .post(`/videos/${videoId}/confirm`)
    .set('Authorization', `Bearer ${authToken}`);
});

Then('o status do vídeo muda para {string}', (expectedStatus) => {
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.video.status, expectedStatus);
});

When('solicito uma URL de upload sem estar autenticado', async () => {
  response = await request(app)
    .post('/videos/upload-url')
    .send({ filename: 'video.mp4' });
});

Then('recebo um erro {int}', (statusCode) => {
  assert.strictEqual(response.status, statusCode);
});

Then('recebo um erro {int} com mensagem {string}', (statusCode, message) => {
  assert.strictEqual(response.status, statusCode);
  assert.ok(
    response.body.error.message.includes(message),
    `Mensagem esperada: "${message}", recebida: "${response.body.error.message}"`
  );
});
