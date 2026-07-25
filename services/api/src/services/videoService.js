const path = require('path');
const { randomUUID } = require('crypto');
const videoRepository = require('../repositories/videoRepository');
const s3Service = require('../infrastructure/storage/s3Service');
const sqsPublisher = require('../infrastructure/queue/sqsPublisher');
const AppError = require('../errors/AppError');
const env = require('../config/env');

/**
 * Solicita uma URL pré-assinada para upload direto ao S3.
 * Cria o registro do vídeo no banco com status UPLOADED.
 */
async function requestUploadUrl(userId, filename) {
  // Regra: máximo de MAX_CONCURRENT_VIDEOS em processamento simultâneo por usuário
  const active = await videoRepository.countActiveByUser(userId);
  if (active >= env.MAX_CONCURRENT_VIDEOS) {
    throw new AppError(
      `Limite de ${env.MAX_CONCURRENT_VIDEOS} vídeos simultâneos em processamento atingido`,
      429,
      'CONCURRENT_LIMIT_REACHED'
    );
  }

  const videoId = randomUUID();
  const ext = path.extname(filename).toLowerCase();
  const s3Key = `videos/${userId}/${videoId}/original${ext}`;

  const { url, expiresIn } = await s3Service.generateUploadUrl(s3Key);

  await videoRepository.create({
    id: videoId,
    user_id: userId,
    original_filename: filename,
    s3_key: s3Key,
    status: 'UPLOADED',
  });

  return { videoId, uploadUrl: url, expiresIn };
}

/**
 * Confirma que o upload foi concluído no S3.
 * Publica mensagem no SQS e atualiza status para QUEUED.
 */
async function confirmUpload(userId, videoId, userEmail) {
  const video = await videoRepository.findByUserAndId(userId, videoId);
  if (!video) {
    throw new AppError('Vídeo não encontrado', 404, 'NOT_FOUND');
  }
  if (video.status !== 'UPLOADED') {
    throw new AppError(
      `Operação inválida. Status atual: ${video.status}`,
      409,
      'INVALID_STATUS_TRANSITION'
    );
  }

  await sqsPublisher.publishVideoJob(video.id, userId, video.s3_key, userEmail);
  await videoRepository.updateStatus(videoId, 'QUEUED');

  return { ...video.toJSON(), status: 'QUEUED' };
}

/**
 * Lista todos os vídeos do usuário autenticado.
 */
async function listVideos(userId) {
  const videos = await videoRepository.findAllByUser(userId);
  return videos.map((v) => ({
    id: v.id,
    originalFilename: v.original_filename,
    status: v.status,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  }));
}

/**
 * Retorna os detalhes de um vídeo específico do usuário.
 */
async function getVideo(userId, videoId) {
  const video = await videoRepository.findByUserAndId(userId, videoId);
  if (!video) {
    throw new AppError('Vídeo não encontrado', 404, 'NOT_FOUND');
  }
  return {
    id: video.id,
    originalFilename: video.original_filename,
    s3Key: video.s3_key,
    status: video.status,
    errorMessage: video.error_message,
    createdAt: video.created_at,
    updatedAt: video.updated_at,
  };
}

/**
 * Gera URL pré-assinada para download do ZIP (apenas vídeos COMPLETED).
 */
async function getDownloadUrl(userId, videoId) {
  const video = await videoRepository.findByUserAndId(userId, videoId);
  if (!video) {
    throw new AppError('Vídeo não encontrado', 404, 'NOT_FOUND');
  }
  if (video.status !== 'COMPLETED') {
    throw new AppError(
      `ZIP ainda não disponível. Status atual: ${video.status}`,
      422,
      'VIDEO_NOT_READY'
    );
  }

  const { url, expiresIn } = await s3Service.generateDownloadUrl(video.zip_s3_key);
  return { downloadUrl: url, expiresIn };
}

module.exports = { requestUploadUrl, confirmUpload, listVideos, getVideo, getDownloadUrl };
