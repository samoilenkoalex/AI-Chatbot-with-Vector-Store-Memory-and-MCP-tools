import { ChatAgent } from '../chat_agent.js';
import { getEmbeddings, padEmbedding } from './llm_service.js';
import { searchQdrant } from './qdrant_service.js';
import { VECTOR_DIMENSION } from '../config/config.js';

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
            const embedding = await getEmbeddings(query);
            const paddedEmbedding = padEmbedding(embedding, VECTOR_DIMENSION);
            return await searchQdrant(paddedEmbedding, userId, chatId);
        } catch (error) {
            console.error('Error searching memory:', error);
            throw error;
        }
    }
}
