import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { CoderConfig, AIProviderConfig, MCPServerConfig, LSPServerConfig } from '../types/index';

export function getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function getConfigFile(): string | undefined {
    const root = getWorkspaceRoot();
    if (!root) return undefined;

    const possiblePaths = [
        path.join(root, 'coder.config.json'),
        path.join(process.env.HOME || process.env.USERPROFILE || '', '.coder', 'config.json')
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    return undefined;
}

export function loadConfig(): CoderConfig {
    const configPath = getConfigFile();
    if (configPath) {
        try {
            const content = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(content) as CoderConfig;
        } catch (error) {
            console.error('Failed to load config', error);
        }
    }
    return {};
}

export function getActiveProviderConfig(): AIProviderConfig | undefined {
    const config = loadConfig();
    const providers = config.coder?.providers || config.providers || [];

    if (config.coder?.activeProvider) {
        return providers.find(p => p.name === config.coder?.activeProvider);
    }

    return providers[0];
}

export function getMCPServers(): Record<string, MCPServerConfig> {
    const config = loadConfig();
    return config.coder?.mcpServers || {};
}

export function getLSPServers(): Record<string, LSPServerConfig> {
    const config = loadConfig();
    return config.coder?.lspServers || {};
}
