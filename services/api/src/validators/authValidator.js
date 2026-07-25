const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Nome deve ter pelo menos 2 caracteres',
    'any.required': 'Nome é obrigatório',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'E-mail inválido',
    'any.required': 'E-mail é obrigatório',
  }),
  password: Joi.string().min(8).max(100).required().messages({
    'string.min': 'Senha deve ter pelo menos 8 caracteres',
    'any.required': 'Senha é obrigatória',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
