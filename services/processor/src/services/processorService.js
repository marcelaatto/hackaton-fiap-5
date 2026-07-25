const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const videoRepository = require('../repositories/videoRepository');
const s3Downloader = require('../infrastructure/storage/s3Downloader');
const s3Uploader = require('../infrastructure/storage/s3Uploader');
const frameExtractor = require('../infrastructure/ffmpeg/frameExtractor');
const zipService = require('./zipService');
const sqsPublisher = require('../infrastructure/queue/sqsPublisher');
const { logger } = require('@hackaton/shared');

// Deve ser igual ao maxReceiveCount configurado na fila SQS
const MAX_RECEIVE_COUNT = 3;

/**
 * Orquestra o processamento completo de um vídeo.
 *
 * Retorna true  → consumer deve deletar a mensagem da fila
 * Retorna false → consumer NÃO deleta → SQS fará retry automático
 *
 * Estratégia de retry:
 * - Tentativas 1 e 2: falha silenciosa, SQS re-entrega a mensagem
 * - Tentativa 3 (MAX_RECEIVE_COUNT): marca FAILED + notifica usuário + deleta mensagem
 */
async function processVideo(message) {
  const payload = JSON.parse(message.Body);
  const { videoId, userId, s3Key, userEmail } = payload;
  const receiveCount = parseInt(
    message.Attributes?.ApproximateReceiveCount || '1',
    10
  );

  // Diretórios temporários isolados por videoId
  const workDir = path.join(os.tmpdir(), `hackaton-${videoId}`);
  const videoPath = path.join(workDir, 'original.mp4');
  const framesDir = path.join(workDir, 'frames');
  const zipPath = path.join(workDir, 'frames.zip');

  logger.info('Iniciando processamento', { videoId, userId, receiveCount });

  try {
    await videoRepository.updateStatus(videoId, 'PROCESSING');
    await fs.mkdir(framesDir, { recursive: true });

    // 1. Download do vídeo do S3
    await s3Downloader.downloadVideo(s3Key, videoPath);

    // 2. Extração de frames com FFmpeg
    await frameExtractor.extractFrames(videoPath, framesDir);

    // 3. Compactação dos frames em ZIP
    await zipService.createZip(framesDir, zipPath);

    // 4. Upload do ZIP para S3
    const zipS3Key = `zips/${userId}/${videoId}/frames.zip`;
    await s3Uploader.uploadZip(zipS3Key, zipPath);

    // 5. Marca como COMPLETED com o caminho do ZIP
    await videoRepository.updateStatus(videoId, 'COMPLETED', { zip_s3_key: zipS3Key });

    logger.info('Processamento concluído com sucesso', { videoId, zipS3Key });
    return true; // deleta a mensagem

  } catch (err) {
    logger.error('Erro ao processar vídeo', {
      videoId,
      error: err.message,
      receiveCount,
      isLastAttempt: receiveCount >= MAX_RECEIVE_COUNT,
    });

    if (receiveCount >= MAX_RECEIVE_COUNT) {
      // Última tentativa esgotada — notifica o usuário e encerra
      await videoRepository
        .updateStatus(videoId, 'FAILED', { error_message: err.message })
        .catch((dbErr) => logger.error('Erro ao atualizar status FAILED', { error: dbErr.message }));

      await sqsPublisher
        .publishFailure(videoId, userId, userEmail, err.message)
        .catch((sqsErr) => logger.error('Erro ao publicar failure', { error: sqsErr.message }));

      return true; // deleta a mensagem (não adianta mais tentar)
    }

    return false; // mantém na fila para retry pelo SQS

  } finally {
    // Limpeza dos arquivos temporários independente do resultado
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { processVideo };
