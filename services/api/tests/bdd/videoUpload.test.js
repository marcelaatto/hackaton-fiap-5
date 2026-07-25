const { defineFeature, loadFeature } = require('jest-cucumber');
const path = require('path');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const env = require('../../src/config/env');

jest.mock('../../src/services/authService');
jest.mock('../../src/services/videoService');
const authService = require('../../src/services/authService');
const videoService = require('../../src/services/videoService');

// Caminho absoluto — funciona independente de onde o Jest é invocado
const feature = loadFeature(path.join(__dirname, 'features/video-upload.feature'));

defineFeature(feature, (test) => {
  let response;
  let authToken;
  let videoId;

  beforeEach(() => {
    jest.clearAllMocks();
    // Login sempre retorna um token válido
    authService.login.mockResolvedValue({
      token: jwt.sign({ sub: 'bdd-user', email: 'usuario@teste.com' }, env.JWT_SECRET, { expiresIn: '1h' }),
      user: { id: 'bdd-user', name: 'BDD User', email: 'usuario@teste.com' },
    });
  });

  // ─── Cenário 1: Fluxo completo ───────────────────────────────────
  test('Fluxo completo de upload bem-sucedido', ({ given, when, then, and }) => {
    given(/^que estou autenticado com email "(.+)"$/, async (email) => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email, password: 'qualquer' });
      authToken = res.body.token;
    });

    when(/^solicito uma URL de upload para o arquivo "(.+)"$/, async (filename) => {
      videoId = 'bdd-video-id';
      videoService.requestUploadUrl.mockResolvedValue({
        videoId,
        uploadUrl: 'https://s3.localstack.local/presigned-upload',
        expiresIn: 300,
      });
      response = await request(app)
        .post('/videos/upload-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ filename });
    });

    then(/^recebo uma URL pré-assinada do S3$/, () => {
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('uploadUrl');
      expect(response.body.uploadUrl).toContain('presigned');
    });

    and(/^o vídeo é registrado com status "(.+)"$/, () => {
      expect(response.body).toHaveProperty('videoId');
      videoId = response.body.videoId;
    });

    when(/^informo que o upload foi concluído$/, async () => {
      videoService.confirmUpload.mockResolvedValue({
        id: videoId,
        status: 'QUEUED',
        original_filename: 'video.mp4',
      });
      response = await request(app)
        .post(`/videos/${videoId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    then(/^o status do vídeo muda para "(.+)"$/, (expectedStatus) => {
      expect(response.status).toBe(200);
      expect(response.body.video.status).toBe(expectedStatus);
    });
  });

  // ─── Cenário 2: Sem autenticação ─────────────────────────────────
  test('Tentativa de upload sem autenticação', ({ when, then }) => {
    when(/^solicito uma URL de upload sem estar autenticado$/, async () => {
      response = await request(app)
        .post('/videos/upload-url')
        .send({ filename: 'video.mp4' });
    });

    then(/^recebo um erro (\d+)$/, (statusCode) => {
      expect(response.status).toBe(parseInt(statusCode));
    });
  });

  // ─── Cenário 3: Arquivo inválido ─────────────────────────────────
  test('Upload com arquivo inválido (não MP4)', ({ given, when, then }) => {
    given(/^que estou autenticado com email "(.+)"$/, async (email) => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email, password: 'qualquer' });
      authToken = res.body.token;
    });

    when(/^solicito uma URL de upload para o arquivo "(.+)"$/, async (filename) => {
      response = await request(app)
        .post('/videos/upload-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ filename });
    });

    then(/^recebo um erro (\d+) com mensagem "(.+)"$/, (statusCode, _msg) => {
      expect(response.status).toBe(parseInt(statusCode));
      expect(response.body.error.message).toContain('MP4');
    });
  });
});
