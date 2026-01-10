
import { z } from 'zod';
import { fetch } from 'undici';
import TurndownService from 'turndown';

const turndownService = new TurndownService();

// Configure turndown to be cleaner
turndownService.remove('script');
turndownService.remove('style');

async function executeFetchUrl(url: string): Promise<string> {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        const text = await res.text();

        // Simple HTML -> Markdown
        const markdown = turndownService.turndown(text);

        // Truncate
        const MAX_LEN = 10000;
        if (markdown.length > MAX_LEN) {
            return markdown.substring(0, MAX_LEN) + "\n... [Truncated]";
        }
        return markdown;

    } catch (e: any) {
        return `Error fetching URL: ${e.message}`;
    }
}

export const fetchUrlTool = {
    description: 'Fetch URL and conver to Markdown.',
    inputSchema: z.object({
        url: z.string().describe('URL to fetch.'),
    }),
    execute: async (args: { url: string }) => {
        return await executeFetchUrl(args.url);
    },
};
