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
        const client = new TavilyMCPClient(query);
        return await client.search();
    },
});
