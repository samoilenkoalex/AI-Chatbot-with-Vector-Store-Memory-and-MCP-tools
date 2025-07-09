import { Request, Response } from 'express';
import { livekitService } from '../services/livekit_service.js';

export class LiveKitController {
    private static instance: LiveKitController;

    private constructor() {}

    public static getInstance(): LiveKitController {
        if (!LiveKitController.instance) {
            LiveKitController.instance = new LiveKitController();
        }
        return LiveKitController.instance;
    }

    async startServer(req: Request, res: Response) {
        try {
            const { userId, chatId, chatName } = req.body;
            if (!userId) {
                return res.status(400).json({ message: 'userId is required' });
            }
            if (!chatId) {
                return res.status(400).json({ message: 'chatId is required' });
            }
            const user = (req as any).user;

            const result = await livekitService.startServer(
                userId,
                chatId,
                chatName
            );

            // Generate LiveKit connection credentials using the worker ID
            const connectionCreds =
                await livekitService.getLivekitConnectionCreds(result.workerId);

            // Combine the server result with the connection credentials
            res.json({
                ...result,
                ...connectionCreds,
            });
        } catch (error) {
            console.error('Error starting LiveKit server:', error);
            res.status(500).json({
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to start LiveKit server',
            });
        }
    }

    async stopServer(req: Request, res: Response) {
        try {
            livekitService.stopServer();
            res.json({ message: 'LiveKit server stopped successfully' });
        } catch (error) {
            console.error('Error stopping LiveKit server:', error);
            res.status(500).json({
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to stop LiveKit server',
            });
        }
    }

    async recordMessage(req: Request, res: Response) {
        try {
            const { question, response, chat_id, chat_name } = req.body;

            if (!question) {
                return res
                    .status(400)
                    .json({ message: 'question is required' });
            }
            if (!response) {
                return res
                    .status(400)
                    .json({ message: 'response is required' });
            }
            if (!chat_id) {
                return res.status(400).json({ message: 'chat_id is required' });
            }
            const user = (req as any).user;

            // Record the message in the database or storage
            const result = await livekitService.recordMessage({
                question,
                response,
                chat_id,
                chat_name,
                user_id: user.id,
                mem0_response: req.body.mem0_response || '',
            });

            res.json({
                message: 'Message recorded successfully',
                data: result,
            });
        } catch (error) {
            console.error('Error recording message:', error);
            res.status(500).json({
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to record message',
            });
        }
    }
}

export const livekitController = LiveKitController.getInstance();
