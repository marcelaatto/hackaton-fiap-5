const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../errors/AppError');

module.exports = function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Token não fornecido', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(new AppError('Token inválido ou expirado', 401, 'INVALID_TOKEN'));
  }
};
