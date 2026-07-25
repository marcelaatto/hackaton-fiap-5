const { Router } = require('express');
const videoController = require('../controllers/videoController');
const authMiddleware = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { uploadUrlSchema } = require('../validators/videoValidator');

const router = Router();

// Todas as rotas de vídeo exigem autenticação
router.use(authMiddleware);

// POST /videos/upload-url — solicita URL pré-assinada para upload no S3
router.post('/upload-url', validate(uploadUrlSchema), videoController.requestUploadUrl);

// POST /videos/:id/confirm — confirma que o upload no S3 foi concluído
router.post('/:id/confirm', videoController.confirmUpload);

// GET /videos — lista vídeos do usuário autenticado
router.get('/', videoController.listVideos);

// GET /videos/:id — consulta detalhes e status de um vídeo
router.get('/:id', videoController.getVideo);

// GET /videos/:id/download-url — URL pré-assinada para download do ZIP
router.get('/:id/download-url', videoController.getDownloadUrl);

module.exports = router;
