
import { z } from 'zod';
import * as vscode from 'vscode';
import { resolve, dirname, isAbsolute } from 'path';
import { invalidateCache } from '../../utils/file-cache';
import { askUserPermission } from '../../utils/user-interaction';
import { DiffManager } from '../diff/DiffManager';
import { progressService } from '../progress';

const executeWriteFile = async (args: { path: string; content: string }) => {
    try {
        let absPath = args.path;
        if (!isAbsolute(absPath)) {
            const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (workspacePath) {
                absPath = resolve(workspacePath, absPath);
            } else {
                absPath = resolve(absPath);
            }
        }

        const uri = vscode.Uri.file(absPath);
        const dirUri = vscode.Uri.file(dirname(absPath));

        let fileExists = false;
        try {
            await vscode.workspace.fs.stat(uri);
            fileExists = true;
        } catch {
            fileExists = false;
        }

        // Ask for permission with Live Diff
        progressService.report(`Requesting permission to write: ${args.path}`);
        const allowed = await DiffManager.validateAndApply(absPath, args.content);

        if (!allowed) {
            progressService.report('File write denied by user');
            return `User denied permission to write file: ${absPath}`;
        }

        progressService.report(`Writing file: ${args.path}`);

        // Ensure directory exists
        await vscode.workspace.fs.createDirectory(dirUri);

        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(uri, encoder.encode(args.content));
        invalidateCache(absPath);

        progressService.report('File write completed');

        const lines = args.content.split('\n');
        const tokenEst = Math.ceil(args.content.length / 4);

        // Brief context
        let contextMatch = "";
        const MAX_LINES = 20;
        if (lines.length > MAX_LINES) {
            contextMatch = lines.slice(0, MAX_LINES).map((l, i) => `${i + 1}: ${l}`).join('\n') + `\n... (${lines.length - MAX_LINES} more lines)`;
        } else {
            contextMatch = lines.map((l, i) => `${i + 1}: ${l}`).join('\n');
        }

        return `File ${fileExists ? 'overwritten' : 'created'} successfully: ${absPath}\nType: ${lines.length} lines, ~${tokenEst} tokens.\n\nContent Preview:\n${contextMatch}`;

    } catch (e: any) {
        return `Failed to write file: ${e.message}`;
    }
};

export const writeFileTool = {
    description: 'Write content to a file (creates new or overwrites existing). Automatically creates directories.',
    inputSchema: z.object({
        path: z.string().describe('The path to the file to write.'),
        content: z.string().describe('The complete content to write.'),
    }),
    execute: async (args: { path: string; content: string }) => {
        return await executeWriteFile(args);
    },
};
