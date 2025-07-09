import { getEmbeddings, padEmbedding } from './llm_service.js';
import { addToMem0 } from './mem0_service.js';
import { addToQdrant, searchQdrant, getChatItems } from './qdrant_service.js';
import { VECTOR_DIMENSION, APP_ID } from '../config/config.js';

export interface MemoryPayload {
    question: string;
    response: string;
    userId: string;
    appId: string;
    timestamp: string;
    mem0_response?: string;
    chat_id?: string;
    chat_name?: string | null;
}

export interface MemoryStorageOptions {
    maxResponseLength?: number;
    maxMem0Length?: number;
    preserveFullResponse?: boolean;
}

export class MemoryService {
    private static instance: MemoryService;

    private constructor() {}

    public static getInstance(): MemoryService {
        if (!MemoryService.instance) {
            MemoryService.instance = new MemoryService();
        }
        return MemoryService.instance;
    }

   // Generate and pad embedding for a given input

    async generateEmbedding(input: string): Promise<number[]> {
        console.log('Generating embedding for input:', input);
        const embedding = await getEmbeddings(input);
        return padEmbedding(embedding, VECTOR_DIMENSION);
    }

    //Search memories from Qdrant

    async searchMemories(
        query: string,
        userId?: string,
        chatId?: string
    ): Promise<any> {
        const embedding = await this.generateEmbedding(query);
        return await searchQdrant(embedding, userId, chatId);
    }

   // Build memory context from search results

    buildMemoryContext(memories: any): string {
        if (!memories || !memories.results || memories.results.length === 0) {
            return '';
        }

        // Collect all mem0_responses
        const mem0Responses = memories.results
            .map(
                (m: { metadata: { mem0_response: string } }) =>
                    m.metadata.mem0_response
            )
            .filter((response: string) => response && response.length > 0);

        // Collect conversation history
        const conversationHistory = memories.results
            .map((memory: { memory: string }) => memory.memory)
            .filter((memory: string) => memory && memory.length > 0);

        // Build the context string
        const contextParts = [];

        if (mem0Responses.length > 0) {
            contextParts.push('User Context:\n' + mem0Responses.join('\n'));
        }

        if (conversationHistory.length > 0) {
            contextParts.push(
                'Conversation History:\n' + conversationHistory.join('\n\n')
            );
        }

        return contextParts.join('\n\n');
    }

    /**
     * Get memory context for a specific chat
     */
    async getChatMemoryContext(
        chatId: string,
        userId: string
    ): Promise<string> {
        try {
            const allUserItems = await getChatItems(userId, chatId);

            if (
                allUserItems &&
                allUserItems.results &&
                allUserItems.results.length > 0
            ) {
                const chatItems = chatId
                    ? allUserItems.results.filter(
                          (item: any) => item.chat_id === chatId
                      )
                    : allUserItems.results;

                if (chatItems.length > 0) {
                    const mem0Responses = chatItems
                        .map((item: any) => item.mem0_response)
                        .filter(
                            (response: string | undefined) =>
                                response && response.length > 0
                        )
                        .join('\n');

                    return mem0Responses;
                }
            }
        } catch (error) {
            console.error('Error fetching memory context:', error);
        }
        return '';
    }

    async storeMemory(
        question: string,
        response: string,
        userId: string,
        chatId?: string,
        chatName?: string,
        options: MemoryStorageOptions = {}
    ): Promise<void> {
        const {
            maxResponseLength = 8000,
            maxMem0Length = 1000,
            preserveFullResponse = false,
        } = options;

        console.log('Storing memory...');

        if (!response) {
            console.log('No response to store in memory');
            return;
        }

        // Generate embedding for the full conversation
        const embedding = await this.generateEmbedding(
            question + ' ' + response
        );

        // Add to mem0
        console.log('Calling mem0 with:', {
            question,
            response:
                response.length > 1500 ? 'truncated response...' : response,
            userId,
            chatId,
        });

        const mem0Response = await addToMem0(
            question,
            response,
            userId,
            chatId
        );

        // Extract memory from mem0 response
        let extractedMemory = '';
        if (
            mem0Response &&
            Array.isArray(mem0Response) &&
            mem0Response.length > 0
        ) {
            extractedMemory = mem0Response
                .map((m: any) => m.data && m.data.memory)
                .filter((content: string) => content && content.length > 0)
                .join('\n');
        }

        console.log(
            'Extracted mem0 memory:',
            extractedMemory || 'No memory extracted'
        );

        // Store in Qdrant
        const payload: MemoryPayload = {
            question,
            response,
            userId,
            appId: APP_ID,
            timestamp: new Date().toISOString(),
            mem0_response: extractedMemory,
            chat_id: chatId,
            chat_name: chatName,
        };

        console.log('Original payload for Qdrant:', payload);

        // Clean and truncate fields for Qdrant if needed
        const cleanedPayload = {
            ...payload,
            response: preserveFullResponse
                ? payload.response
                : payload.response.length > maxResponseLength
                ? payload.response.substring(0, maxResponseLength) +
                  '... (truncated)'
                : payload.response,
            mem0_response:
                payload.mem0_response &&
                payload.mem0_response.length > maxMem0Length
                    ? payload.mem0_response.substring(0, maxMem0Length) +
                      '... (truncated)'
                    : payload.mem0_response,
        };

        console.log('Cleaned payload for Qdrant:', cleanedPayload);

        try {
            await addToQdrant(embedding, cleanedPayload);
            console.log('Memory stored successfully');
        } catch (error) {
            console.error('Error adding to Qdrant:', error);
            throw error;
        }
    }
}

export const memoryService = MemoryService.getInstance();
