import { Request, Response } from 'express';
import { ChatService } from '../services/chat_service.js';
import {
    getAllUserItems,
    getItemsWithChatName,
} from '../services/qdrant_service.js';

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        username: string;
    };
}

class ChatController {
    private chatService: ChatService;
    private static instance: ChatController;

    private constructor() {
        this.chatService = new ChatService();
    }

    public static getInstance(): ChatController {
        if (!ChatController.instance) {
            ChatController.instance = new ChatController();
        }
        return ChatController.instance;
    }

    async chat(req: Request, res: Response) {
        try {
            const { message, chatId, chatName } = req.body;

            console.log('message>>>>>>:', message);
            const userId = (req as any).user?.id;

            if (!message) {
                return res.status(400).json({ message: 'Message is required' });
            }

            console.log('Processing chat request...');
            const result = await this.chatService.chat(
                message,
                userId,
                chatId,
                chatName
            );
            console.log('Chat response:', JSON.stringify(result, null, 2));
            res.json(result);
        } catch (error) {
            res.status(500).json({
                message: error instanceof Error ? error.message : 'Chat failed',
            });
        }
    }

    async searchMemory(req: Request, res: Response) {
        try {
            const { query } = req.body;
            const userId = (req as any).user?.id;

            if (!query) {
                return res.status(400).json({ message: 'Query is required' });
            }

            const result = await this.chatService.searchMemory(query, userId);
            res.json(result);
        } catch (error) {
            console.error('Error in search memory:', error);
            res.status(500).json({
                message:
                    error instanceof Error
                        ? error.message
                        : 'Memory search failed',
            });
        }
    }

    async fetchCurrentChat(
        req: AuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const userId = req.user?.id;
            const chatId = req.query.chatId as string;

            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const chatHistory = await getAllUserItems(userId);

            if (chatId) {
                // Filter messages for specific chat
                const filteredHistory = {
                    results: chatHistory.results.filter(
                        (item) => item.chat_id === chatId
                    ),
                };

                // Transform to expected format
                const messages = filteredHistory.results
                    .map((item) => [
                        { role: 'user', content: item.question },
                        { role: 'assistant', content: item.response },
                    ])
                    .flat();

                res.status(200).json({ messages });
            } else {
                // Return all messages in the expected format
                const messages = chatHistory.results
                    .map((item) => [
                        { role: 'user', content: item.question },
                        { role: 'assistant', content: item.response },
                    ])
                    .flat();

                res.status(200).json({ messages });
            }
        } catch (error) {
            console.error('Error fetching chat history:', error);
            res.status(500).json({ error: 'Failed to fetch chat history' });
        }
    }

    async getChatItems(req: Request, res: Response) {
        try {
            const chatItems = await getItemsWithChatName();
            res.json(chatItems);
        } catch (error) {
            console.error('Error fetching chat items:', error);
            res.status(500).json({ error: 'Failed to fetch chat items' });
        }
    }

    async handleMessage(req: Request, res: Response) {
        try {
            const { message, userId, chatId, chatName } = req.body;
            const result = await this.chatService.chat(
                message,
                userId,
                chatId,
                chatName
            );

            // Check if we have a raw tool response
            const firstMessage = result.messages?.[0] as unknown as {
                content: string;
                additional_kwargs?: {
                    is_raw_tool_response?: boolean;
                };
            };

            // Always return the response, whether it's from Tavily or LLM
            res.json(result);
        } catch (error) {
            console.error('Error in handleMessage:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export const chatController = ChatController.getInstance();
