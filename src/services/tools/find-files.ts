
import { z } from 'zod';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { resolve } from 'path';

async function findFilesVSCode(pattern: string, maxResults: number = 50): Promise<string> {
    try {
        const exclude = "**/{node_modules,.git,dist,out,build,.next,coverage}/**";
        const uris = await vscode.workspace.findFiles(pattern, exclude, maxResults);

        if (uris.length === 0) {
            return `No files found matching "${pattern}"`;
        }

        return `Found ${uris.length} matches:\n` + uris.map(u => vscode.workspace.asRelativePath(u)).join('\n');
    } catch (e: any) {
        return `Error finding files: ${e.message}`;
    }
}

export const findFilesTool = {
    description: 'Find files and directories by path pattern (glob).',
    inputSchema: z.object({
        pattern: z.string().describe('Glob pattern to match file paths. e.g. "**/*.ts", "src/*.js"'),
        maxResults: z.number().optional().describe('Maximum number of results to return'),
    }),
    execute: async (args: { pattern: string; maxResults?: number }) => {
        return await findFilesVSCode(args.pattern, args.maxResults);
    },
};
