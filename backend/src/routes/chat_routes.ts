import { Router } from 'express';
import { chatController } from '../controllers/chat_controller.js';
import { verifyToken } from '../middleware/auth_middleware.js';

const router = Router();

// Protected routes - require authentication
router.post(
    '/message',
    verifyToken,
    (req, res, next) => {
        next();
    },
    chatController.chat.bind(chatController)
);
// router.post(
//     '/search-memory',
//     verifyToken,
//     chatController.searchMemory.bind(chatController)
// );

// Route to fetch current chat history
router.get(
    '/current',
    verifyToken,
    chatController.fetchCurrentChat.bind(chatController)
);

// Route to get all chat items with chat names
router.get('/items', verifyToken, (req, res) =>
    chatController.getChatItems(req, res)
);

export default router;
