const processorService = require('../../../src/services/processorService');
const videoRepository = require('../../../src/repositories/videoRepository');
const s3Downloader = require('../../../src/infrastructure/storage/s3Downloader');
const s3Uploader = require('../../../src/infrastructure/storage/s3Uploader');
const frameExtractor = require('../../../src/infrastructure/ffmpeg/frameExtractor');
const zipService = require('../../../src/services/zipService');
const sqsPublisher = require('../../../src/infrastructure/queue/sqsPublisher');

jest.mock('../../../src/repositories/videoRepository');
jest.mock('../../../src/infrastructure/storage/s3Downloader');
jest.mock('../../../src/infrastructure/storage/s3Uploader');
jest.mock('../../../src/infrastructure/ffmpeg/frameExtractor');
jest.mock('../../../src/services/zipService');
jest.mock('../../../src/infrastructure/queue/sqsPublisher');
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
}));

const makeMessage = (receiveCount = 1, videoId = 'video-1', userId = 'user-1') => ({
  MessageId: 'msg-id-1',
  ReceiptHandle: 'receipt-handle',
  Body: JSON.stringify({
    videoId,
    userId,
    userEmail: 'user@test.com',
    s3Key: `videos/${userId}/${videoId}/original.mp4`,
  }),
  Attributes: { ApproximateReceiveCount: String(receiveCount) },
});

describe('processorService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('processVideo — fluxo de sucesso', () => {
    it('deve executar todas as etapas e retornar true', async () => {
      videoRepository.updateStatus.mockResolvedValue();
      s3Downloader.downloadVideo.mockResolvedValue();
      frameExtractor.extractFrames.mockResolvedValue(10);
      zipService.createZip.mockResolvedValue(1024);
      s3Uploader.uploadZip.mockResolvedValue();

      const result = await processorService.processVideo(makeMessage(1));

      expect(result).toBe(true);
    });

    it('deve atualizar status para PROCESSING e depois COMPLETED', async () => {
      videoRepository.updateStatus.mockResolvedValue();
      s3Downloader.downloadVideo.mockResolvedValue();
      frameExtractor.extractFrames.mockResolvedValue(10);
      zipService.createZip.mockResolvedValue(1024);
      s3Uploader.uploadZip.mockResolvedValue();

      await processorService.processVideo(makeMessage(1));

      expect(videoRepository.updateStatus).toHaveBeenCalledWith('video-1', 'PROCESSING');
      expect(videoRepository.updateStatus).toHaveBeenCalledWith(
        'video-1',
        'COMPLETED',
        expect.objectContaining({ zip_s3_key: 'zips/user-1/video-1/frames.zip' })
      );
    });

    it('não deve publicar evento de falha em caso de sucesso', async () => {
      videoRepository.updateStatus.mockResolvedValue();
      s3Downloader.downloadVideo.mockResolvedValue();
      frameExtractor.extractFrames.mockResolvedValue(5);
      zipService.createZip.mockResolvedValue(512);
      s3Uploader.uploadZip.mockResolvedValue();

      await processorService.processVideo(makeMessage(1));

      expect(sqsPublisher.publishFailure).not.toHaveBeenCalled();
    });
  });

  describe('processVideo — falha nas primeiras tentativas', () => {
    it('deve retornar false na primeira falha (retry pelo SQS)', async () => {
      videoRepository.updateStatus.mockResolvedValue();
      s3Downloader.downloadVideo.mockRejectedValue(new Error('S3 indisponível'));

      const result = await processorService.processVideo(makeMessage(1));

      expect(result).toBe(false);
      expect(sqsPublisher.publishFailure).not.toHaveBeenCalled();
    });

    it('deve retornar false na segunda falha', async () => {
      videoRepository.updateStatus.mockResolvedValue();
      frameExtractor.extractFrames.mockRejectedValue(new Error('FFmpeg erro'));
      s3Downloader.downloadVideo.mockResolvedValue();

      const result = await processorService.processVideo(makeMessage(2));

      expect(result).toBe(false);
    });

    it('não deve marcar como FAILED antes da última tentativa', async () => {
      videoRepository.updateStatus.mockResolvedValue();
      s3Downloader.downloadVideo.mockRejectedValue(new Error('Falha'));

      await processorService.processVideo(makeMessage(2));

      expect(videoRepository.updateStatus).not.toHaveBeenCalledWith(
        'video-1',
        'FAILED',
        expect.anything()
      );
    });
  });

  describe('processVideo — última tentativa (esgotamento de retries)', () => {
    it('deve retornar true na última tentativa com falha', async () => {
      videoRepository.updateStatus.mockResolvedValue();
      s3Downloader.downloadVideo.mockRejectedValue(new Error('Erro fatal'));
      sqsPublisher.publishFailure.mockResolvedValue();

      const result = await processorService.processVideo(makeMessage(3));

      expect(result).toBe(true); // deleta a mensagem
    });

    it('deve marcar como FAILED com mensagem de erro', async () => {
      videoRepository.updateStatus.mockResolvedValue();
      s3Downloader.downloadVideo.mockRejectedValue(new Error('S3 fatal'));
      sqsPublisher.publishFailure.mockResolvedValue();

      await processorService.processVideo(makeMessage(3));

      expect(videoRepository.updateStatus).toHaveBeenCalledWith(
        'video-1',
        'FAILED',
        expect.objectContaining({ error_message: 'S3 fatal' })
      );
    });

    it('deve publicar evento de falha para o Notification Service', async () => {
      videoRepository.updateStatus.mockResolvedValue();
      s3Downloader.downloadVideo.mockRejectedValue(new Error('Timeout S3'));
      sqsPublisher.publishFailure.mockResolvedValue();

      await processorService.processVideo(makeMessage(3));

      expect(sqsPublisher.publishFailure).toHaveBeenCalledWith(
        'video-1',
        'user-1',
        'user@test.com',
        'Timeout S3'
      );
    });
  });
});
