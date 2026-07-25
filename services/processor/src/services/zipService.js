const archiver = require('archiver');
const fs = require('fs');
const { logger } = require('@hackaton/shared');

/**
 * Compacta todos os arquivos de um diretório em um ZIP.
 *
 * @param {string} framesDir - Diretório com os frames extraídos
 * @param {string} zipPath   - Caminho do arquivo ZIP de saída
 * @returns {Promise<number>} - Tamanho total do ZIP em bytes
 */
async function createZip(framesDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', () => {
      const bytes = archive.pointer();
      logger.info('ZIP criado', { zipPath, bytes });
      resolve(bytes);
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        logger.warn('Arquivo não encontrado ao criar ZIP', { error: err.message });
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => {
      logger.error('Erro ao criar ZIP', { error: err.message });
      reject(err);
    });

    archive.pipe(output);
    // false = não cria subdiretório no ZIP (frames ficam na raiz)
    archive.directory(framesDir, false);
    archive.finalize();
  });
}

module.exports = { createZip };
