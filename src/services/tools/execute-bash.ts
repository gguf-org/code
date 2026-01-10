
import { z } from 'zod';
import * as vscode from 'vscode';
import { askUserPermission } from '../../utils/user-interaction';
import { progressService } from '../progress';
import { ProcessManager } from '../process-manager';

const TRUNCATION_OUTPUT_LIMIT = 10000;

export const executeBashTool = {
    description: 'Execute a bash command (or shell command on Windows). Returns stdout, stderr, and exit code.',
    inputSchema: z.object({
        command: z.string().describe('The command to execute.'),
    }),
    execute: async (args: { command: string }) => {
        try {
            // Validate command
            const command = args.command?.trim();
            if (!command) {
                return 'Error: Command cannot be empty';
            }

            // Check for dangerous commands
            const dangerousPatterns = [
                /rm\s+-rf\s+\/(?!\w)/i, // rm -rf / (but allow /path)
                /mkfs/i, // Format filesystem
                /dd\s+if=/i, // Direct disk write
                /:(){:|:&};:/i, // Fork bomb
                />\s*\/dev\/sd[a-z]/i, // Writing to raw disk devices
                /chmod\s+-R\s+000/i, // Remove all permissions recursively
            ];

            for (const pattern of dangerousPatterns) {
                if (pattern.test(command)) {
                    return `Error: Command contains potentially destructive operation: "${command}". This command is blocked for safety.`;
                }
            }

            progressService.report(`Requesting permission to execute: ${command}`);

            const permissionGranted = await askUserPermission(
                `Do you want to execute command: "${command}"?`
            );

            if (!permissionGranted) {
                progressService.report('Command execution denied by user');
                return `User denied permission to execute command: ${command}`;
            }

            progressService.report(`Executing command: ${command}`);

            const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

            // Execute command using ProcessManager
            const result = await ProcessManager.executeCommand(command, {
                cwd,
                timeout: 60000, // 60 seconds timeout
            });

            progressService.report('Command execution completed');

            // Format output for LLM
            const formattedOutput = ProcessManager.formatOutput(result, TRUNCATION_OUTPUT_LIMIT);

            return formattedOutput;
        } catch (e: any) {
            progressService.report(`Command execution failed: ${e.message}`);
            return `Command execution failed: ${e.message}`;
        }
    },
};
