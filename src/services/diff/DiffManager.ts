
import * as vscode from 'vscode';
import { askUserPermission } from '../../utils/user-interaction';

export class DiffManager {
    static async validateAndApply(originalPath: string, newContent: string): Promise<boolean> {
        const originalUri = vscode.Uri.file(originalPath);

        // Check if file exists to decide logic
        let fileExists = false;
        try {
            await vscode.workspace.fs.stat(originalUri);
            fileExists = true;
        } catch {
            fileExists = false;
        }

        let leftUri = originalUri;
        let createdLeftTemp = false;

        if (!fileExists) {
            // For new files, compare against an empty file
            leftUri = vscode.Uri.file(originalPath + ".empty.tmp");
            await vscode.workspace.fs.writeFile(leftUri, new Uint8Array(0));
            createdLeftTemp = true;
        }

        const tempUri = vscode.Uri.file(originalPath + ".diff.tmp");
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(tempUri, encoder.encode(newContent));

        // Open Diff
        // We use 'vscode.diff' command
        const title = `Diff: ${vscode.workspace.asRelativePath(originalPath)} (Current vs Proposed)`;

        // Show diff in a new tab (active)
        await vscode.commands.executeCommand('vscode.diff', leftUri, tempUri, title);

        // Ask for permission - blocking call
        // This relies on the global permission handler or the QuickPick logic
        const allowed = await askUserPermission(
            `Review changes for "${vscode.workspace.asRelativePath(originalPath)}". Apply these changes?`
        );

        // Clean up temp file
        try {
            await vscode.workspace.fs.delete(tempUri);
            if (createdLeftTemp) {
                await vscode.workspace.fs.delete(leftUri);
            }
        } catch (e) {
            console.warn("Failed to delete temp diff file", e);
        }

        // Close the diff editor?
        // We can't easily close a specific tab via API without complex logic.
        // User can close it manually or it naturally stays open as reference.

        return allowed;
    }
}
