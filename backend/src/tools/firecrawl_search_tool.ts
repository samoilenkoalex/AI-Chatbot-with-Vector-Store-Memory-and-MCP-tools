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
        try {
            const client = new FirecrawlMCPClient(url);
            const rawContent = await client.search();

            let cleanContent = rawContent;
            try {
                const parsed = JSON.parse(rawContent);
                if (parsed.type === 'text' && parsed.text) {
                    cleanContent = parsed.text;
                }
            } catch (e) {
                // If it's not JSON, use the raw content
                cleanContent = rawContent;
            }

            // Clean up escaped characters and formatting
            cleanContent = cleanContent
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
                .replace(/\\u[\da-fA-F]{4}/g, (match) => {
                    return String.fromCharCode(
                        parseInt(match.replace('\\u', ''), 16)
                    );
                });

            // Remove markdown links to make content cleaner for summarization
            cleanContent = cleanContent
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/\\_/g, '_')
                .replace(/\\#/g, '#');

            // Return a structured response that's easier for the LLM to process
            return `Content scraped from ${url}:\n\n${cleanContent}`;
        } catch (error) {
            console.error('Error scraping content:', error);
            return `Error scraping content from ${url}: ${error}`;
        }
    },
});
