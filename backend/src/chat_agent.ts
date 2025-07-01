import {
    getEmbeddings,
    getLLMResponse,
    padEmbedding,
} from './services/llm_service.js';
import {
    ensureQdrantCollection,
    searchQdrant,
    addToQdrant,
} from './services/qdrant_service.js';
import { addToMem0 } from './services/mem0_service.js';
import { VECTOR_DIMENSION, APP_ID } from './config/config.js';

export class ChatAgent {
    private static _instance: ChatAgent | null = null;
    private _initialized: boolean = false;
    private appId: string = APP_ID;

    public static getInstance(): ChatAgent {
        if (!ChatAgent._instance) {
            ChatAgent._instance = new ChatAgent();
        }
        return ChatAgent._instance;
    }

    private constructor() {
        if (!this._initialized) {
            this._initialized = true;
            console.log('ChatAgent initialized');
            // Ensure Qdrant collection exists with correct dimensions
            ensureQdrantCollection().catch(console.error);
        }
    }

    public async ask(
        question: string,
        userId?: string,
        chatId?: string,
        chatName?: string
    ): Promise<{ messages: string[] }> {
        // Search for relevant memories
        const embedding = await getEmbeddings(question);
        const paddedEmbedding = padEmbedding(embedding, VECTOR_DIMENSION);
        const memories = await searchQdrant(paddedEmbedding, userId, chatId);
        console.log(
            'Previous memories:',
            memories.results.map((m) => m.metadata.mem0_response).join('\n')
        );

        // Build context from memories
        let context = 'Relevant information from previous conversations:\n';
        if (memories.results && memories.results.length > 0) {
            for (const memory of memories.results) {
                context += ` - ${memory.memory}\n`;
            }
        }

        // Prepare messages for LLM
        const messages = [
            {
                role: 'system' as const,
                content: `You are a helpful assistant. Use the provided context to personalize your responses and remember past interactions. ${context}`,
            },
            {
                role: 'user' as const,
                content: question,
            },
        ];

        // Get response from LLM
        const response = await getLLMResponse(messages);

        // Add to memory
        await this.addMemory(question, response, userId, chatId, chatName);

        return { messages: [response] };
    }

    private async addMemory(
        question: string,
        response: string,
        userId?: string,
        chatId?: string,
        chatName?: string
    ): Promise<void> {
        const embedding = await getEmbeddings(question + ' ' + response);
        const paddedEmbedding = padEmbedding(embedding, VECTOR_DIMENSION);

        // Add to mem0 first to get the response
        console.log('Calling mem0 with:', { question, response, userId });
        const mem0Response = await addToMem0(question, response, userId);
        console.log(
            'Raw mem0 response:',
            JSON.stringify(mem0Response, null, 2)
        );

        // Handle null or invalid mem0 response gracefully
        let mem0Memory = '';
        if (
            mem0Response &&
            Array.isArray(mem0Response) &&
            mem0Response.length > 0
        ) {
            mem0Memory = mem0Response[0]?.data?.memory || '';
        }
        console.log('Extracted mem0Memory:', mem0Memory);

        const metadata = {
            question,
            response,
            userId,
            appId: this.appId,
            timestamp: new Date().toISOString(),
            mem0_response: mem0Memory,
            ...(chatId && { chat_id: chatId }),
            ...(chatName && { chat_name: chatName }),
        };
        console.log(
            'Metadata being sent to Qdrant:',
            JSON.stringify(metadata, null, 2)
        );

        await addToQdrant(paddedEmbedding, metadata);
    }

    public async searchMemory(
        query: string,
        userId?: string,
        chatId?: string
    ): Promise<any> {
        const embedding = await getEmbeddings(query);
        const paddedEmbedding = padEmbedding(embedding, VECTOR_DIMENSION);
        return await searchQdrant(paddedEmbedding, userId, chatId);
    }
}
