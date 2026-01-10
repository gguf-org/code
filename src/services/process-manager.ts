import { spawn, ChildProcess } from 'child_process';
import { platform } from 'os';
import { existsSync } from 'fs';

export interface ProcessResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
}

export class ProcessManager {
    private static readonly MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB
    private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

    /**
     * Execute a shell command and capture output
     */
    static async executeCommand(
        command: string,
        options?: {
            timeout?: number;
            maxOutputSize?: number;
            cwd?: string;
        }
    ): Promise<ProcessResult> {
        const timeout = options?.timeout ?? ProcessManager.DEFAULT_TIMEOUT;
        const maxOutputSize = options?.maxOutputSize ?? ProcessManager.MAX_OUTPUT_SIZE;

        return new Promise((resolve, reject) => {
            const { shell, shellArgs } = ProcessManager.getShellConfig();
            
            const proc = spawn(shell, [...shellArgs, command], {
                cwd: options?.cwd,
                windowsHide: true,
            });

            let stdout = '';
            let stderr = '';
            let isResolved = false;
            let timeoutHandle: NodeJS.Timeout | undefined;

            // Set timeout
            if (timeout > 0) {
                timeoutHandle = setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        proc.kill('SIGTERM');
                        reject(new Error(`Command timed out after ${timeout}ms`));
                    }
                }, timeout);
            }

            proc.stdout.on('data', (data: Buffer) => {
                const chunk = data.toString();
                if (stdout.length + chunk.length > maxOutputSize) {
                    if (!isResolved) {
                        isResolved = true;
                        proc.kill('SIGTERM');
                        if (timeoutHandle) clearTimeout(timeoutHandle);
                        reject(new Error(`Output exceeded maximum size of ${maxOutputSize} bytes`));
                    }
                    return;
                }
                stdout += chunk;
            });

            proc.stderr.on('data', (data: Buffer) => {
                const chunk = data.toString();
                if (stderr.length + chunk.length > maxOutputSize) {
                    if (!isResolved) {
                        isResolved = true;
                        proc.kill('SIGTERM');
                        if (timeoutHandle) clearTimeout(timeoutHandle);
                        reject(new Error(`Error output exceeded maximum size of ${maxOutputSize} bytes`));
                    }
                    return;
                }
                stderr += chunk;
            });

            proc.on('close', (code: number | null) => {
                if (!isResolved) {
                    isResolved = true;
                    if (timeoutHandle) clearTimeout(timeoutHandle);
                    resolve({
                        stdout,
                        stderr,
                        exitCode: code,
                    });
                }
            });

            proc.on('error', (error: Error) => {
                if (!isResolved) {
                    isResolved = true;
                    if (timeoutHandle) clearTimeout(timeoutHandle);
                    reject(error);
                }
            });
        });
    }

    /**
     * Get shell configuration based on platform
     */
    private static getShellConfig(): { shell: string; shellArgs: string[] } {
        const currentPlatform = platform();

        if (currentPlatform === 'win32') {
            // Try to find Git Bash on Windows
            const gitBashPaths = [
                'C:\\Program Files\\Git\\bin\\bash.exe',
                'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
                `C:\\Users\\${process.env['USERNAME'] || 'User'}\\AppData\\Local\\Programs\\Git\\bin\\bash.exe`,
            ];

            for (const bashPath of gitBashPaths) {
                if (existsSync(bashPath)) {
                    return { shell: bashPath, shellArgs: ['-c'] };
                }
            }

            // Fallback to PowerShell on Windows
            return { shell: 'powershell.exe', shellArgs: ['-Command'] };
        }

        // Unix-like systems (Linux, macOS)
        return { shell: 'sh', shellArgs: ['-c'] };
    }

    /**
     * Format output for LLM consumption
     */
    static formatOutput(result: ProcessResult, truncateAt: number = 10000): string {
        let output = '';

        // Include exit code
        if (result.exitCode !== null) {
            output += `EXIT_CODE: ${result.exitCode}\n`;
        }

        // Include stderr if present
        if (result.stderr) {
            output += `STDERR:\n${result.stderr}\n`;
        }

        // Include stdout
        if (result.stdout) {
            output += result.stderr ? `STDOUT:\n${result.stdout}` : result.stdout;
        }

        // Truncate if needed
        if (output.length > truncateAt) {
            output = output.substring(0, truncateAt) + '\n... [Output truncated. Use more specific commands to see full output]';
        }

        return output || 'Command executed successfully with no output.';
    }
}
