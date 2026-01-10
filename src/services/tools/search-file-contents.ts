
import { z } from 'zod';
import * as vscode from 'vscode';

async function searchFileContentsVSCode(
    query: string,
    maxResults: number = 50,
    caseSensitive: boolean = false
): Promise<string> {
    try {
        // Find files but exclude common noisy directories
        const excludePattern = "**/{node_modules,.git,dist,out,build,.next,coverage,.cache,test-results}/**";
        const files = await vscode.workspace.findFiles('**/*', excludePattern, 1000);

        const matches: string[] = [];
        // Create regex safely
        let regex: RegExp;
        try {
            regex = new RegExp(query, caseSensitive ? 'gm' : 'gmi');
        } catch (e: any) {
            return `Invalid regex pattern: ${e.message}`;
        }

        for (const file of files) {
            if (matches.length >= maxResults) break;

            try {
                // Read content using vscode fs
                const uint8Array = await vscode.workspace.fs.readFile(file);
                const content = new TextDecoder().decode(uint8Array);

                // Search
                // matchAll returns an iterator
                const fileMatches = [...content.matchAll(regex)];

                if (fileMatches.length > 0) {
                    const lines = content.split('\n');

                    for (const match of fileMatches) {
                        if (matches.length >= maxResults) break;
                        if (match.index === undefined) continue;

                        // Find line number
                        // Optimization: counting newlines up to index
                        const preMatch = content.substring(0, match.index);
                        const lineNum = preMatch.split('\n').length; // 1-based
                        const lineContent = lines[lineNum - 1].trim();

                        // Truncate line content if too long
                        const displayContent = lineContent.length > 100 ? lineContent.substring(0, 100) + '...' : lineContent;

                        matches.push(`${vscode.workspace.asRelativePath(file)}:${lineNum}  ${displayContent}`);
                    }
                }
            } catch (e) {
                // ignore read error (e.g. binary file or permission)
            }
        }

        if (matches.length === 0) {
            return `No matches found for "${query}"`;
        }

        return `Found ${matches.length} matches:\n\n` + matches.join('\n');

    } catch (e: any) {
        return `Error searching file contents: ${e.message}`;
    }
}

export const searchFileContentsTool = {
    description: 'Search for text or code INSIDE file contents using regex.',
    inputSchema: z.object({
        query: z.string().describe('Regex pattern to search for (e.g. "function.*blah").'),
        maxResults: z.number().optional().describe('Maximum number of results to return (default 50).'),
        caseSensitive: z.boolean().optional().describe('Case sensitive search (default false).'),
    }),
    execute: async (args: { query: string; maxResults?: number; caseSensitive?: boolean }) => {
        return await searchFileContentsVSCode(args.query, args.maxResults, args.caseSensitive);
    },
};
