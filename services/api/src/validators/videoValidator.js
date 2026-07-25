const Joi = require('joi');

const uploadUrlSchema = Joi.object({
  filename: Joi.string()
    .pattern(/\.mp4$/i)
    .max(255)
    .required()
    .messages({
      'string.pattern.base': 'Formato não suportado. Apenas arquivos MP4 são aceitos.',
      'any.required': 'filename é obrigatório',
    }),
});

module.exports = { uploadUrlSchema };
