class AppError extends Error {
  /**
   * @param {string} message  - Mensagem legível
   * @param {number} statusCode - HTTP status code (default 500)
   * @param {string} code     - Código de erro interno (default 'INTERNAL_ERROR')
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // distingue erros esperados de bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
