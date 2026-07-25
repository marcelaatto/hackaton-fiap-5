const videoService = require('../../../src/services/videoService');
const videoRepository = require('../../../src/repositories/videoRepository');
const s3Service = require('../../../src/infrastructure/storage/s3Service');
const sqsPublisher = require('../../../src/infrastructure/queue/sqsPublisher');

jest.mock('../../../src/repositories/videoRepository');
jest.mock('../../../src/infrastructure/storage/s3Service');
jest.mock('../../../src/infrastructure/queue/sqsPublisher');

const USER_ID = 'user-uuid-1';
const VIDEO_ID = 'video-uuid-1';

describe('videoService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('requestUploadUrl', () => {
    it('deve gerar URL de upload e criar registro do vídeo', async () => {
      videoRepository.countActiveByUser.mockResolvedValue(0);
      s3Service.generateUploadUrl.mockResolvedValue({
        url: 'https://s3.example.com/presigned-url',
        expiresIn: 300,
      });
      videoRepository.create.mockResolvedValue({});

      const result = await videoService.requestUploadUrl(USER_ID, 'meu-video.mp4');

      expect(result).toHaveProperty('videoId');
      expect(result).toHaveProperty('uploadUrl', 'https://s3.example.com/presigned-url');
      expect(result).toHaveProperty('expiresIn', 300);
      expect(videoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: USER_ID, status: 'UPLOADED' })
      );
    });

    it('deve lançar 429 ao atingir limite de vídeos simultâneos', async () => {
      videoRepository.countActiveByUser.mockResolvedValue(3);

      await expect(
        videoService.requestUploadUrl(USER_ID, 'video.mp4')
      ).rejects.toMatchObject({ statusCode: 429, code: 'CONCURRENT_LIMIT_REACHED' });

      expect(videoRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('confirmUpload', () => {
    it('deve publicar no SQS e atualizar status para QUEUED', async () => {
      const fakeVideo = {
        id: VIDEO_ID,
        user_id: USER_ID,
        s3_key: 'videos/user/video/original.mp4',
        status: 'UPLOADED',
        toJSON: () => ({ id: VIDEO_ID, status: 'UPLOADED' }),
      };
      videoRepository.findByUserAndId.mockResolvedValue(fakeVideo);
      sqsPublisher.publishVideoJob.mockResolvedValue({});
      videoRepository.updateStatus.mockResolvedValue({});

      const result = await videoService.confirmUpload(USER_ID, VIDEO_ID, 'test@test.com');

      expect(sqsPublisher.publishVideoJob).toHaveBeenCalledWith(
        VIDEO_ID, USER_ID, fakeVideo.s3_key, 'test@test.com'
      );
      expect(videoRepository.updateStatus).toHaveBeenCalledWith(VIDEO_ID, 'QUEUED');
      expect(result.status).toBe('QUEUED');
    });

    it('deve lançar 404 se vídeo não pertence ao usuário', async () => {
      videoRepository.findByUserAndId.mockResolvedValue(null);

      await expect(
        videoService.confirmUpload(USER_ID, 'outro-video-id', 'test@test.com')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('deve lançar 409 se vídeo não está em status UPLOADED', async () => {
      videoRepository.findByUserAndId.mockResolvedValue({
        id: VIDEO_ID, status: 'QUEUED', toJSON: () => ({})
      });

      await expect(
        videoService.confirmUpload(USER_ID, VIDEO_ID, 'test@test.com')
      ).rejects.toMatchObject({ statusCode: 409, code: 'INVALID_STATUS_TRANSITION' });
    });
  });

  describe('getDownloadUrl', () => {
    it('deve retornar URL de download para vídeo COMPLETED', async () => {
      videoRepository.findByUserAndId.mockResolvedValue({
        id: VIDEO_ID,
        status: 'COMPLETED',
        zip_s3_key: 'zips/user/video/frames.zip',
      });
      s3Service.generateDownloadUrl.mockResolvedValue({
        url: 'https://s3.example.com/download-url',
        expiresIn: 3600,
      });

      const result = await videoService.getDownloadUrl(USER_ID, VIDEO_ID);

      expect(result.downloadUrl).toBe('https://s3.example.com/download-url');
      expect(result.expiresIn).toBe(3600);
    });

    it('deve lançar 422 se vídeo não está COMPLETED', async () => {
      videoRepository.findByUserAndId.mockResolvedValue({
        id: VIDEO_ID, status: 'PROCESSING',
      });

      await expect(
        videoService.getDownloadUrl(USER_ID, VIDEO_ID)
      ).rejects.toMatchObject({ statusCode: 422, code: 'VIDEO_NOT_READY' });
    });
  });
});
