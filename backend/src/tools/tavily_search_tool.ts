import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { TavilyMCPClient } from '../clients/tavily_mcp_client.js';
import { getChatItems } from '../services/qdrant_service.js';

export const tavilySearchTool = new DynamicStructuredTool({
    name: 'tavily_search',
    description: 'Search the web for real-time information using Tavily API.',
    schema: z.object({
        query: z.string().describe('The search query to look up'),
        userId: z.string().describe('The user ID for chat history'),
        chatId: z.string().describe('The chat ID for chat history'),
    }),
    func: async ({
        query,
        userId,
        chatId,
    }: {
        query: string;
        userId: string;
        chatId: string;
    }) => {
        try {

            console.log(
                'Tavily search with userId:',
                userId,
                'chatId:',
                chatId
            );

            // Get chat history if userId and chatId are available
            let chatHistory = '';
            if (userId && chatId && userId !== '' && chatId !== '') {
                console.log('Fetching chat history...');
                try {
                    const historyData = await getChatItems(userId, chatId);
                    console.log('Chat history data:', historyData);
                    if (historyData.results && historyData.results.length > 0) {
                        // Find the last entry with a non-empty mem0_response
                        const lastMemoryEntry = historyData.results
                            .reverse() // Start from the most recent
                            .find(
                                (item) =>
                                    item.mem0_response &&
                                    item.mem0_response.trim() !== ''
                            );

                        if (lastMemoryEntry && lastMemoryEntry.mem0_response) {
                            chatHistory = lastMemoryEntry.mem0_response;
                            console.log(
                                'Found last mem0_response:',
                                chatHistory
                            );
                        } else {
                            console.log(
                                'No mem0_response found in chat history'
                            );
                        }
                    }
                } catch (error) {
                    console.error('Error fetching chat history:', error);
                }
            } else {
                console.log('No userId or chatId provided for chat history');
            }

            console.log(
                'Creating TavilyMCPClient with mem0_response:',
                chatHistory
            );
            const client = new TavilyMCPClient(
                query,
                userId,
                chatId,
                chatHistory
            );
            return await client.search();
        } catch (error: any) {
            console.error('Tavily search failed:', error);
            return {
                content: `I couldn't retrieve the latest information about "${query}" due to a technical issue. Here's what I know from my training data:`,
                error: error.message || 'Unknown error',
                already_stored: false,
            };
        }
    },
});
