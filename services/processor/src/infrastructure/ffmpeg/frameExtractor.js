const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const { logger } = require('@hackaton/shared');
const env = require('../../config/env');

/**
 * Extrai frames de um vídeo usando FFmpeg.
 *
 * Decisão arquitetural: 1 frame por segundo (configurável via env).
 * Para um vídeo de 2 minutos (máximo permitido), isso gera no máximo 120 frames,
 * mantendo o ZIP num tamanho razoável.
 *
 * @param {string} videoPath  - Caminho do vídeo de entrada
 * @param {string} framesDir  - Diretório de saída dos frames (deve existir)
 * @returns {Promise<number>} - Quantidade de frames extraídos
 */
async function extractFrames(videoPath, framesDir) {
  return new Promise((resolve, reject) => {
    let frameCount = 0;

    ffmpeg(videoPath)
      .outputOptions([
        '-vf', `fps=${env.FFMPEG_FRAMES_PER_SECOND}`,
        '-q:v', '2',         // qualidade JPEG (2 = alta, 31 = baixa)
      ])
      .output(path.join(framesDir, 'frame-%04d.jpg'))
      .on('start', (cmd) => {
        logger.debug('FFmpeg iniciado', { cmd });
      })
      .on('progress', (progress) => {
        if (progress.frames) frameCount = progress.frames;
      })
      .on('end', () => {
        logger.info('Extração de frames concluída', { videoPath, frameCount });
        resolve(frameCount);
      })
      .on('error', (err) => {
        logger.error('Erro no FFmpeg', { error: err.message, videoPath });
        reject(new Error(`FFmpeg falhou: ${err.message}`));
      })
      .run();
  });
}

module.exports = { extractFrames };
