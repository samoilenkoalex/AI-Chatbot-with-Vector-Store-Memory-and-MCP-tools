import Memory from 'mem0ai';
import {
    MEM0_API_KEY,
    OLLAMA_BASE_URL,
    LLM_MODEL,
    EMBEDDING_MODEL,
    APP_ID,
} from '../config/config.js';

console.log('Debug - Environment variables:');
console.log('MEM0_API_KEY:', MEM0_API_KEY ? 'Set' : 'Not set');

export const memory = new Memory({
    apiKey: MEM0_API_KEY,
    llm: {
        provider: 'custom',
        config: {
            endpoint: `${OLLAMA_BASE_URL}/api/chat`,
            model: LLM_MODEL,
        },
    },
    embedder: {
        provider: 'custom',
        config: {
            endpoint: `${OLLAMA_BASE_URL}/api/embeddings`,
            model: EMBEDDING_MODEL,
        },
    },
    customPrompt: `
    Please only extract entities containing patient health information, appointment details, and user information. 
    Here are some few shot examples:

    Input: Hi.
    Output: {{"facts" : []}}

    Input: The weather is nice today.
    Output: {{"facts" : []}}

    Input: I have a headache and would like to schedule an appointment.
    Output: {{"facts" : ["Patient reports headache", "Wants to schedule an appointment"]}}

    Input: My name is Jane Smith, and I need to reschedule my appointment for next Tuesday.
    Output: {{"facts" : ["Patient name: Jane Smith", "Wants to reschedule appointment", "Original appointment: next Tuesday"]}}

    Input: I have diabetes and my blood sugar is high.
    Output: {{"facts" : ["Patient has diabetes", "Reports high blood sugar"]}}

    Return the facts and patient information in a json format as shown above.
    `,
    version: 'v1.1',
} as any);

export async function addToMem0(
    question: string,
    response: string,
    userId: string | undefined
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
            // Remove 100 more chars each time
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
            user_id: userId || 'default-user',
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
