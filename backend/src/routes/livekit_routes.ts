import { Router } from 'express';
import { livekitController } from '../controllers/livekit_controller.js';
import { verifyToken } from '../middleware/auth_middleware.js';

const router = Router();

// Protected routes - require authentication
router.post(
    '/start',
    verifyToken,
    livekitController.startServer.bind(livekitController)
);
router.post(
    '/stop',
    verifyToken,
    livekitController.stopServer.bind(livekitController)
);
router.post(
    '/record_message',
    verifyToken,
    livekitController.recordMessage.bind(livekitController)
);

export default router;
