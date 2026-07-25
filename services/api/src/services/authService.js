const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const AppError = require('../errors/AppError');
const env = require('../config/env');

async function register({ name, email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new AppError('E-mail já cadastrado', 409, 'EMAIL_ALREADY_EXISTS');
  }

  const password_hash = await bcrypt.hash(password, 12);
  const user = await userRepository.create({ name, email, password_hash });

  return { id: user.id, name: user.name, email: user.email };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  // Mesmo erro intencional para não revelar se o e-mail existe
  if (!user) {
    throw new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email },
  };
}

module.exports = { register, login };
