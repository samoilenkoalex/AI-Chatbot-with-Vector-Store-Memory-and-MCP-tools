import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { TavilyMCPClient } from '../clients/tavily_mcp_client.js';

export const tavilySearchTool = new DynamicStructuredTool({
    name: 'tavily_search',
    description: 'Search the web for real-time information using Tavily API.',
    schema: z.object({
        query: z.string().describe('The search query to look up'),
    }),
    func: async ({ query }: { query: string }) => {
        try {
            const client = new TavilyMCPClient(query);
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
