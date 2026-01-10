
import { z } from 'zod';
import * as vscode from 'vscode';

async function executeGetDiagnostics(args: { path?: string }): Promise<string> {

    // If specific path
    if (args.path) {
        const uri = vscode.Uri.file(args.path); // Needs absolute path?
        // If relative, make absolute based on workspace
        // But `args.path` might be relative or absolute. VSCode API often wants Uri.

        // Try convert to Uri
        // We can use vscode.workspace.findFiles to match the file if it's relative?
        // Or just assume it's relative to root if not absolute.

        let targetUri: vscode.Uri;
        if (args.path.startsWith('/') || args.path.match(/^[a-zA-Z]:/)) {
            targetUri = vscode.Uri.file(args.path);
        } else {
            const wsFolders = vscode.workspace.workspaceFolders;
            if (wsFolders) {
                targetUri = vscode.Uri.joinPath(wsFolders[0].uri, args.path);
            } else {
                return "Error: No workspace open to resolve relative path.";
            }
        }

        const diagnostics = vscode.languages.getDiagnostics(targetUri);
        if (diagnostics.length === 0) return `No diagnostics (errors/warnings) found for ${args.path}`;

        return formatDiagnostics(diagnostics, args.path);
    }

    // Else all diagnostics
    const allDiagnostics = vscode.languages.getDiagnostics();
    let output = "";

    for (const [uri, diags] of allDiagnostics) {
        if (diags.length === 0) continue;
        const relPath = vscode.workspace.asRelativePath(uri);
        output += formatDiagnostics(diags, relPath) + "\n";
    }

    if (!output) return "No diagnostics found in workspace.";
    return output;
}

function formatDiagnostics(diags: vscode.Diagnostic[], filename: string): string {
    return diags.map(d => {
        const severity = d.severity === vscode.DiagnosticSeverity.Error ? 'ERROR' :
            d.severity === vscode.DiagnosticSeverity.Warning ? 'WARNING' : 'INFO';
        return `${filename}:${d.range.start.line + 1} [${severity}] ${d.message}`;
    }).join('\n');
}

export const getDiagnosticsTool = {
    description: 'Get errors and warnings (diagnostics) for a file or workspace.',
    inputSchema: z.object({
        path: z.string().optional().describe('Path to specific file to check.'),
    }),
    execute: async (args: { path?: string }) => {
        return await executeGetDiagnostics(args);
    },
};
