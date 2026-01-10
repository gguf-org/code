
import { z } from 'zod';
import * as vscode from 'vscode';
import { resolve } from 'path';
import { getCachedFileContent, invalidateCache } from '../../utils/file-cache';
import { DiffManager } from '../diff/DiffManager';

async function executeStringReplace(args: { path: string; old_str: string; new_str: string }): Promise<string> {
    const { path, old_str, new_str } = args;
    const absPath = resolve(path);

    try {
        // Read fresh content (bypass cache to be safe, or use cache if we trust it? use cache with invalidation)
        const cached = await getCachedFileContent(absPath);
        const content = cached.content;

        // Check occurrence
        // We need robust checking.
        if (!content.includes(old_str)) {
            // Simple check failed. Maybe whitespace issues?
            // For now, adhere to strict replacement to verify correctness.
            return `Error: 'old_str' not found in file '${path}'. Please ensure exact match including whitespace.`;
        }

        const occurrences = content.split(old_str).length - 1;
        if (occurrences > 1) {
            return `Error: 'old_str' matches ${occurrences} times. Please provide more context to make it unique.`;
        }

        const newContent = content.replace(old_str, new_str);

        // Preview and Permission
        const allowed = await DiffManager.validateAndApply(absPath, newContent);
        if (!allowed) {
            return `User denied permission to replace content in: ${path}`;
        }

        const uri = vscode.Uri.file(absPath);
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(uri, encoder.encode(newContent));
        invalidateCache(absPath);

        return `Successfully replaced content in ${path}.`;

    } catch (e: any) {
        return `Error replacing string: ${e.message}`;
    }
}

export const stringReplaceTool = {
    description: 'Replace exact string content in a file. Must provide unique match.',
    inputSchema: z.object({
        path: z.string().describe('The path to the file.'),
        old_str: z.string().describe('Exact string to replace.'),
        new_str: z.string().describe('New replacement string.'),
    }),
    execute: async (args: { path: string; old_str: string; new_str: string }) => {
        return await executeStringReplace(args);
    },
};
