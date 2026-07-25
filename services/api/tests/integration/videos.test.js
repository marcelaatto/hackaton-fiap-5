const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
// Importa env APÓS app para garantir que o módulo já foi carregado com seus defaults
const env = require('../../src/config/env');

jest.mock('../../src/services/videoService');
const videoService = require('../../src/services/videoService');

// Assina o token com o mesmo secret que env.js vai usar — evita problema de cache de módulo
const TEST_USER = { id: 'user-uuid-test', email: 'test@test.com' };
const authToken = jwt.sign({ sub: TEST_USER.id, email: TEST_USER.email }, env.JWT_SECRET, {
  expiresIn: '1h',
});

const authHeader = { Authorization: `Bearer ${authToken}` };

describe('Video Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Autenticação', () => {
    it('deve retornar 401 sem token', async () => {
      const res = await request(app).get('/videos');
      expect(res.status).toBe(401);
    });

    it('deve retornar 401 com token inválido', async () => {
      const res = await request(app)
        .get('/videos')
        .set('Authorization', 'Bearer token.invalido');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /videos/upload-url', () => {
    it('deve retornar 201 com videoId e uploadUrl', async () => {
      videoService.requestUploadUrl.mockResolvedValue({
        videoId: 'video-uuid-1',
        uploadUrl: 'https://s3.example.com/presigned',
        expiresIn: 300,
      });

      const res = await request(app)
        .post('/videos/upload-url')
        .set(authHeader)
        .send({ filename: 'meu-video.mp4' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('videoId');
      expect(res.body).toHaveProperty('uploadUrl');
    });

    it('deve retornar 422 para arquivo não MP4', async () => {
      const res = await request(app)
        .post('/videos/upload-url')
        .set(authHeader)
        .send({ filename: 'video.avi' });

      expect(res.status).toBe(422);
      expect(res.body.error.message).toContain('MP4');
    });

    it('deve retornar 429 ao atingir limite de vídeos', async () => {
      const { AppError } = require('@hackaton/shared');
      videoService.requestUploadUrl.mockRejectedValue(
        new AppError('Limite atingido', 429, 'CONCURRENT_LIMIT_REACHED')
      );

      const res = await request(app)
        .post('/videos/upload-url')
        .set(authHeader)
        .send({ filename: 'video.mp4' });

      expect(res.status).toBe(429);
    });
  });

  describe('POST /videos/:id/confirm', () => {
    it('deve retornar 200 com vídeo em status QUEUED', async () => {
      videoService.confirmUpload.mockResolvedValue({
        id: 'video-uuid-1',
        status: 'QUEUED',
        original_filename: 'video.mp4',
      });

      const res = await request(app)
        .post('/videos/video-uuid-1/confirm')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.video.status).toBe('QUEUED');
    });
  });

  describe('GET /videos', () => {
    it('deve retornar lista de vídeos do usuário', async () => {
      videoService.listVideos.mockResolvedValue([
        { id: 'v1', originalFilename: 'a.mp4', status: 'COMPLETED' },
        { id: 'v2', originalFilename: 'b.mp4', status: 'PROCESSING' },
      ]);

      const res = await request(app).get('/videos').set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.videos).toHaveLength(2);
    });
  });

  describe('GET /videos/:id', () => {
    it('deve retornar detalhes do vídeo', async () => {
      videoService.getVideo.mockResolvedValue({
        id: 'video-uuid-1',
        status: 'COMPLETED',
        originalFilename: 'video.mp4',
      });

      const res = await request(app).get('/videos/video-uuid-1').set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body.video).toHaveProperty('id', 'video-uuid-1');
    });

    it('deve retornar 404 para vídeo inexistente', async () => {
      const { AppError } = require('@hackaton/shared');
      videoService.getVideo.mockRejectedValue(new AppError('Não encontrado', 404, 'NOT_FOUND'));

      const res = await request(app).get('/videos/nao-existe').set(authHeader);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /videos/:id/download-url', () => {
    it('deve retornar URL de download para vídeo COMPLETED', async () => {
      videoService.getDownloadUrl.mockResolvedValue({
        downloadUrl: 'https://s3.example.com/zip',
        expiresIn: 3600,
      });

      const res = await request(app)
        .get('/videos/video-uuid-1/download-url')
        .set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('downloadUrl');
    });

    it('deve retornar 422 para vídeo ainda não processado', async () => {
      const { AppError } = require('@hackaton/shared');
      videoService.getDownloadUrl.mockRejectedValue(
        new AppError('ZIP não disponível', 422, 'VIDEO_NOT_READY')
      );

      const res = await request(app)
        .get('/videos/video-uuid-1/download-url')
        .set(authHeader);

      expect(res.status).toBe(422);
    });
  });
});
