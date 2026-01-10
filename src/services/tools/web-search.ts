
import { z } from 'zod';
import { fetch } from 'undici';
import * as cheerio from 'cheerio';
import { progressService } from '../progress';

async function executeWebSearch(query: string, maxResults: number = 10): Promise<string> {
    try {
        progressService.report(`Searching for: "${query}"`);

        // Use Brave Search as in the CLI tool
        const encoded = encodeURIComponent(query);
        const url = `https://search.brave.com/search?q=${encoded}`;

        progressService.report('Fetching search results...');

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        progressService.report('Parsing search results...');

        const html = await res.text();
        const $ = cheerio.load(html);

        let results: string[] = [];

        $('[data-type="web"]').each((i, el) => {
            if (results.length >= maxResults) return;

            const $el = $(el);
            const titleLink = $el.find('a[href^="http"]').first();
            const title = titleLink.text().trim();
            const link = titleLink.attr('href');
            const snippet = $el.find('.snippet-description').text().trim();

            if (title && link) {
                results.push(`**${title}**\nLink: ${link}\n${snippet}\n`);
            }
        });

        progressService.report(`Found ${results.length} results`);

        if (results.length === 0) return `No results found for "${query}"`;

        return results.join('\n---\n');

    } catch (e: any) {
        progressService.report(`Web search failed: ${e.message}`);
        return `Web Search failed: ${e.message}`;
    }
}

export const webSearchTool = {
    description: 'Web Search (using Brave Search).',
    inputSchema: z.object({
        query: z.string().describe('Search query.'),
        max_results: z.number().optional().describe('Max results (default 10).'),
    }),
    execute: async (args: { query: string; max_results?: number }) => {
        return await executeWebSearch(args.query, args.max_results);
    },
};
