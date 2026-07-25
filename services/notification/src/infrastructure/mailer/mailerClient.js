const nodemailer = require('nodemailer');
const env = require('../../config/env');

/**
 * Cria um transporter Nodemailer.
 *
 * Local:      aponta para MailHog (SMTP fake) — todos os e-mails são capturados
 *             e visíveis em http://localhost:8025
 * Produção:   basta trocar SMTP_HOST/PORT/USER/PASS por credenciais reais
 *             (SES, SendGrid, etc.) sem alterar o código.
 */
function createTransport() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,   // MailHog não usa TLS
    ignoreTLS: true, // evita upgrade desnecessário em ambiente local
  });
}

module.exports = { createTransport };
