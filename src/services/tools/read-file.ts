
import { z } from 'zod';
import { getCachedFileContent } from '../../utils/file-cache';
import { resolve, dirname, isAbsolute } from 'path';
import * as vscode from 'vscode';
import {
    CHARS_PER_TOKEN_ESTIMATE,
    FILE_READ_CHUNKING_HINT_THRESHOLD_LINES,
    FILE_READ_CHUNK_SIZE_LINES,
    FILE_READ_METADATA_THRESHOLD_LINES,
} from '../../constants';
import { progressService } from '../progress';

const executeReadFile = async (args: {
    path: string;
    start_line?: number;
    end_line?: number;
}): Promise<string> => {
    let absPath = args.path;
    if (!isAbsolute(absPath)) {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspacePath) {
            absPath = resolve(workspacePath, absPath);
        } else {
            absPath = resolve(absPath);
        }
    }

    try {
        progressService.report(`Reading file: ${args.path}`);
        const cached = await getCachedFileContent(absPath);
        const content = cached.content;

        if (content.length === 0) {
            // Check if it's truly empty or just not loaded?
            // getCachedFileContent reads it.
            // Let's assume empty file is valid but rare.
            // throw new Error(`File "${args.path}" exists but is empty (0 tokens)`);
            return `File "${args.path}" is empty.`;
        }

        const lines = cached.lines;
        const totalLines = lines.length;
        const fileSize = content.length;
        const estimatedTokens = Math.ceil(fileSize / CHARS_PER_TOKEN_ESTIMATE);

        if (
            args.start_line === undefined &&
            args.end_line === undefined &&
            totalLines > FILE_READ_METADATA_THRESHOLD_LINES
        ) {
            let output = `File: ${args.path}\n`;
            output += `Total lines: ${totalLines.toLocaleString()}\n`;
            output += `Size: ${fileSize.toLocaleString()} bytes\n`;
            output += `Estimated tokens: ~${estimatedTokens.toLocaleString()}\n\n`;

            if (totalLines <= FILE_READ_CHUNKING_HINT_THRESHOLD_LINES) {
                output += `[Medium file - To read specific sections, call read_file with start_line and end_line]\n`;
            } else {
                output += `[Large file - Read in chunks recommended]\n`;
            }

            return output;
        }

        const startLine = args.start_line ? Math.max(1, args.start_line) : 1;
        const endLine = args.end_line
            ? Math.min(totalLines, args.end_line)
            : totalLines;

        const linesToReturn = lines.slice(startLine - 1, endLine);

        let result = '';
        for (let i = 0; i < linesToReturn.length; i++) {
            const lineNum = String(startLine + i).padStart(4, ' ');
            result += `${lineNum}: ${linesToReturn[i]}\n`;
        }

        return result.slice(0, -1);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return `File not found: ${args.path}`; // Return string instead of throwing to be handled by LLM gracefully
        }
        return `Error reading file ${args.path}: ${error.message}`;
    }
};

export const readFileTool = {
    description: 'Read file contents with line numbers.',
    inputSchema: z.object({
        path: z.string().describe('The path to the file to read (relative to workspace or absolute).'),
        start_line: z.number().optional().describe('Start line number (1-indexed)'),
        end_line: z.number().optional().describe('End line number (inclusive)'),
    }),
    execute: executeReadFile,
};
