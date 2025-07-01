import { ChatAgent } from '../chat_agent.js';

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
            return await this.chatAgent.ask(message, userId, chatId, chatName);
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
            return await this.chatAgent.searchMemory(query, userId, chatId);
        } catch (error) {
            console.error('Error searching memory:', error);
            throw error;
        }
    }
}
