import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
import { CoderPanel } from './CoderPanel';
import { MCPService } from './services/mcp/MCPService';
import { LSPService } from './services/lsp/LSPService';

let mcpService: MCPService | undefined;
let lspService: LSPService | undefined;

export async function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel('Coder');
	outputChannel.appendLine('Coder extension activating...');

	// Register Sidebar Provider
	const sidebarProvider = new SidebarProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"coder.sidebarView",
			sidebarProvider
		)
	);

	// Initialize Services
	mcpService = new MCPService(outputChannel);
	lspService = new LSPService(outputChannel);

	// Start services asynchronously
	mcpService.start().catch(err => {
		outputChannel.appendLine(`Failed to start MCP service: ${err.message}`);
	});
	lspService.start();

	// Register command to open webview
	context.subscriptions.push(
		vscode.commands.registerCommand('coder.openWebview', () => {
			CoderPanel.createOrShow(context.extensionUri);
		})
	);

	outputChannel.appendLine('Coder extension activated');
}

export async function deactivate() {
	if (mcpService) {
		await mcpService.dispose();
	}
}
