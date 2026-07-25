const { createTransport } = require('../infrastructure/mailer/mailerClient');
const { logger } = require('@hackaton/shared');
const env = require('../config/env');

/**
 * Envia e-mail de notificação de falha para o usuário.
 *
 * @param {object} params
 * @param {string} params.videoId      - ID do vídeo que falhou
 * @param {string} params.userId       - ID do usuário
 * @param {string} params.userEmail    - E-mail do destinatário
 * @param {string} params.errorMessage - Mensagem de erro do processamento
 */
async function sendFailureNotification({ videoId, userId, userEmail, errorMessage }) {
  const transporter = createTransport();
  const failedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to: userEmail,
    subject: '[FIAP X] Falha no processamento do seu vídeo',
    text: [
      'Olá,',
      '',
      'Infelizmente o processamento do seu vídeo falhou após múltiplas tentativas.',
      '',
      `ID do vídeo : ${videoId}`,
      `Ocorrido em : ${failedAt}`,
      `Detalhe     : ${errorMessage}`,
      '',
      'Por favor, faça um novo upload ou entre em contato com o suporte.',
      '',
      'Equipe FIAP X',
    ].join('\n'),
    html: `
      <h2 style="color:#c0392b">Falha no Processamento do Vídeo</h2>
      <p>Infelizmente o processamento do seu vídeo falhou após múltiplas tentativas.</p>
      <table cellpadding="6" style="border-collapse:collapse">
        <tr>
          <td><strong>ID do vídeo</strong></td>
          <td>${videoId}</td>
        </tr>
        <tr>
          <td><strong>Ocorrido em</strong></td>
          <td>${failedAt}</td>
        </tr>
        <tr>
          <td><strong>Detalhe</strong></td>
          <td>${errorMessage}</td>
        </tr>
      </table>
      <p>Por favor, faça um novo upload ou entre em contato com o suporte.</p>
      <p><em>Equipe FIAP X</em></p>
    `,
  });

  logger.info('E-mail de notificação enviado', {
    videoId,
    userId,
    to: userEmail,
    messageId: info.messageId,
  });
}

module.exports = { sendFailureNotification };
