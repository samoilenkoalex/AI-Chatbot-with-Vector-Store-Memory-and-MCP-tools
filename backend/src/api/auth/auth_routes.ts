import { Router } from 'express';
import authController from './auth_controller';
import { authMiddleware } from './auth_middleware';

const router = Router();

router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.get(
    '/protected',
    authMiddleware,
    authController.getProtected.bind(authController)
);

export default router;
