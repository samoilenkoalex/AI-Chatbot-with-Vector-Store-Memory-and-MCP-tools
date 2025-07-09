import Memory from 'mem0ai';
import {
    MEM0_API_KEY,
    OLLAMA_BASE_URL,
    LLM_MODEL,
    EMBEDDING_MODEL,
    APP_ID,
} from '../config/config.js';
import { MEM0_EXTRACTION_PROMPT } from '../config/prompts.js';

console.log('Debug - Environment variables:');
console.log('MEM0_API_KEY:', MEM0_API_KEY ? 'Set' : 'Not set');

export const memory = new Memory({
    apiKey: MEM0_API_KEY,
    llm: {
        provider: 'ollama',
        config: {
            model: LLM_MODEL,
            ollama_base_url: '${OLLAMA_BASE_URL}/api/chat',

            temperature: 0.1,
            max_tokens: 1000,
        },
    },
    embedder: {
        provider: 'ollama',
        config: {
            model: EMBEDDING_MODEL,
            ollama_base_url: `${OLLAMA_BASE_URL}/api/embeddings`,
        },
    },
    customPrompt: MEM0_EXTRACTION_PROMPT,
    version: 'v1.1',
} as any);

export async function addToMem0(
    question: string,
    response: string,
    userId: string | undefined,
    chatId: string | undefined
): Promise<any> {
    try {
        const maxMetaLength = 1800;
        let trimmedResponse = response;
        let metadata = {
            appId: APP_ID,
            question,
            response: trimmedResponse,
        };
        let metaStr = JSON.stringify(metadata);
        // Trim response until metadata fits
        while (metaStr.length > maxMetaLength && trimmedResponse.length > 0) {
            trimmedResponse =
                trimmedResponse.substring(0, trimmedResponse.length - 100) +
                '... (truncated)';
            metadata = {
                appId: APP_ID,
                question,
                response: trimmedResponse,
            };
            metaStr = JSON.stringify(metadata);
        }
        // If still too large, try with empty response
        if (metaStr.length > maxMetaLength) {
            metadata = {
                appId: APP_ID,
                question,
                response: '',
            };
            metaStr = JSON.stringify(metadata);
        }
        // If still too large, log and return null
        if (metaStr.length > maxMetaLength) {
            console.error(
                'Metadata still too large for mem0 after trimming. Skipping memory creation.'
            );
            console.error('Final metadata:', metadata);
            console.error('Final metadata length:', metaStr.length);
            return null;
        }
        console.log('Final metadata to be sent to mem0:', metadata);
        console.log('Final metadata string length:', metaStr.length);
        const messages = [
            {
                role: 'user' as const,
                content: question,
            },
            {
                role: 'assistant' as const,
                content: trimmedResponse,
            },
        ];
        const mem0Response = await memory.add(messages, {
            version: 'v2',
            user_id: chatId || 'default-user',
            app_id: APP_ID,
            metadata,
        });
        console.log('Memory added to mem0ai with response:', mem0Response);
        return mem0Response;
    } catch (error) {
        console.error('Error adding to mem0:', error);
        return null;
    }
}
