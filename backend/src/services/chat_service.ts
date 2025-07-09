import { ChatAgent } from '../chat_agent.js';
import { memoryService } from './memory_service.js';

export class ChatService {
    private chatAgent: ChatAgent;

    constructor() {
        this.chatAgent = ChatAgent.getInstance();
    }

    async chat(
        message: string,
        userId: string,
        chatId?: string,
        chatName?: string
    ) {
        try {
            const initialState = {
                question: message,
                userId,
                chatId,
                chatName,
                appId: this.chatAgent.getAppId(),
                messages: [],
                embedding: [],
                memories: null,
                context: '',
                response: '',
            };

            // Run the graph
            const result = await this.chatAgent.runGraph(initialState);
            return { messages: [result.response] };
        } catch (error) {
            console.error('Error in chat service:', error);
            throw error;
        }
    }

    async searchMemory(
        query: string,
        userId?: string,
        chatId?: string
    ): Promise<any> {
        try {
            return await memoryService.searchMemories(query, userId, chatId);
        } catch (error) {
            console.error('Error searching memory:', error);
            throw error;
        }
    }
}
