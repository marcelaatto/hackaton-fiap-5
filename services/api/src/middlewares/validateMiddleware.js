const AppError = require('../errors/AppError');

/**
 * Middleware de validação com Joi.
 * @param {import('joi').Schema} schema - Schema Joi para validar req.body
 */
function validate(schema) {
  return (req, _res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(new AppError(message, 422, 'VALIDATION_ERROR'));
    }
    next();
  };
}

module.exports = validate;
