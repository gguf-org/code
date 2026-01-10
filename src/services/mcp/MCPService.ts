import * as vscode from 'vscode';
import { getMCPServers } from '../config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

interface MCPServerConnection {
    name: string;
    client: Client;
    transport: StdioClientTransport;
    tools: Tool[];
}

export class MCPService {
    private connections: Map<string, MCPServerConnection> = new Map();

    constructor(private outputChannel: vscode.OutputChannel) { }

    async start() {
        try {
            const servers = getMCPServers();
            const serverNames = Object.keys(servers);

            if (serverNames.length === 0) {
                this.outputChannel.appendLine('MCP Service: No servers configured.');
                return;
            }

            this.outputChannel.appendLine(`MCP Service: Found ${serverNames.length} servers in config.`);

            for (const [name, config] of Object.entries(servers)) {
                try {
                    await this.connectToServer(name, config);
                } catch (error: any) {
                    this.outputChannel.appendLine(`MCP Service: Failed to connect to '${name}': ${error.message}`);
                }
            }
        } catch (error: any) {
            this.outputChannel.appendLine(`MCP Service Error: ${error.message}`);
        }
    }

    private async connectToServer(name: string, config: { command: string; args: string[]; env?: Record<string, string> }) {
        this.outputChannel.appendLine(`MCP Service: Connecting to '${name}'...`);

        const transport = new StdioClientTransport({
            command: config.command,
            args: config.args,
            env: config.env,
        });

        const client = new Client({
            name: 'vscode-coder-extension',
            version: '1.0.0',
        }, {
            capabilities: {},
        });

        await client.connect(transport);

        // List available tools
        const toolsResponse = await client.listTools();
        const tools = toolsResponse.tools || [];

        this.connections.set(name, {
            name,
            client,
            transport,
            tools,
        });

        this.outputChannel.appendLine(`MCP Service: Connected to '${name}' with ${tools.length} tools`);
        tools.forEach(tool => {
            this.outputChannel.appendLine(`  - ${tool.name}: ${tool.description || 'No description'}`);
        });
    }

    async callTool(serverName: string, toolName: string, args: any): Promise<any> {
        const connection = this.connections.get(serverName);
        if (!connection) {
            throw new Error(`MCP server '${serverName}' not connected`);
        }

        const result = await connection.client.callTool({
            name: toolName,
            arguments: args,
        });

        return result;
    }

    getAvailableTools(): Array<{ server: string; tool: Tool }> {
        const allTools: Array<{ server: string; tool: Tool }> = [];

        for (const [serverName, connection] of this.connections) {
            for (const tool of connection.tools) {
                allTools.push({ server: serverName, tool });
            }
        }

        return allTools;
    }

    async dispose() {
        for (const [name, connection] of this.connections) {
            try {
                await connection.client.close();
                this.outputChannel.appendLine(`MCP Service: Disconnected from '${name}'`);
            } catch (error: any) {
                this.outputChannel.appendLine(`MCP Service: Error disconnecting from '${name}': ${error.message}`);
            }
        }
        this.connections.clear();
    }
}
