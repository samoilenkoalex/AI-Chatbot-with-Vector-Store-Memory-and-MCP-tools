import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { FirecrawlMCPClient } from '../clients/firecrawl_mcp_client.js';

export const firecrawlSearchTool = new DynamicStructuredTool({
    name: 'firecrawl_search',
    description:
        'Scrape and extract content from a webpage using FireCrawl API.',
    schema: z.object({
        url: z.string().describe('The URL of the webpage to scrape'),
    }),
    func: async ({ url }: { url: string }) => {
        const client = new FirecrawlMCPClient(url);
        return await client.search();
    },
});
