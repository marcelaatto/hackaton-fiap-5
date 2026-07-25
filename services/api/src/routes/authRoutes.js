const { Router } = require('express');
const authController = require('../controllers/authController');
const validate = require('../middlewares/validateMiddleware');
const { registerSchema, loginSchema } = require('../validators/authValidator');

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

module.exports = router;
