import { Router } from 'express';
import { AuthController } from '../controllers/auth_controller.js';
import { verifyToken } from '../middleware/auth_middleware.js';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', verifyToken, authController.getProfile);

export default router;
