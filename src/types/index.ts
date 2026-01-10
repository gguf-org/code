
import { type Tool as AISDKTool, jsonSchema, tool } from 'ai';

export { tool, jsonSchema };

// Type for AI SDK tools (return type of tool() function)
// Tool<PARAMETERS, RESULT> is AI SDK's actual tool type
// We use 'any' for generics since we don't auto-execute tools (human-in-the-loop)
// biome-ignore lint/suspicious/noExplicitAny: Dynamic typing required
// We use 'any' for generics since we don't auto-execute tools (human-in-the-loop)
// biome-ignore lint/suspicious/noExplicitAny: Dynamic typing required
export type AISDKCoreTool = any;

// Current Coder message format (OpenAI-compatible)
// Note: We maintain this format internally and convert to ModelMessage at AI SDK boundary
export interface Message {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
}

export interface ToolCall {
    id: string;
    function: {
        name: string;
        arguments: Record<string, unknown>;
    };
}

export interface ToolResult {
    tool_call_id: string;
    role: 'tool';
    name: string;
    content: string;
}

export interface ToolParameterSchema {
    type?: string;
    description?: string;
    [key: string]: unknown;
}

export interface Tool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, ToolParameterSchema>;
            required: string[];
        };
    };
}

// Tool handlers accept dynamic args from LLM, so any is appropriate here
// biome-ignore lint/suspicious/noExplicitAny: Dynamic typing required -- Tool arguments are dynamically typed
export type ToolHandler = (input: any) => Promise<string>;

/**
 * Tool formatter type for Ink UI
 * Formats tool arguments and results for display in the CLI
 */
export type ToolFormatter = (
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic typing required -- Tool arguments are dynamically typed
    args: any,
    result?: string,
) =>
    | string
    | Promise<string>
    // Removed React.ReactElement return type to avoid React dependency in core types if possible
    // or just keep it as any/string for now since we are in VS Code extension host
    | any;

/**
 * Tool validator type for pre-execution validation
 * Returns validation result with optional error message
 */
export type ToolValidator = (
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic typing required -- Tool arguments are dynamically typed
    args: any,
) => Promise<{ valid: true } | { valid: false; error: string }>;

export interface CoderToolExport {
    name: string;
    tool: AISDKCoreTool;
    formatter?: ToolFormatter;
    validator?: ToolValidator;
}

export interface ToolEntry {
    name: string;
    tool: AISDKCoreTool;
    handler: ToolHandler;
    formatter?: ToolFormatter;
    validator?: ToolValidator;
}

interface LLMMessage {
    role: 'assistant';
    content: string;
    tool_calls?: ToolCall[];
}

export interface LLMChatResponse {
    choices: Array<{
        message: LLMMessage;
    }>;
    autoExecutedMessages?: Message[];
}

export interface StreamCallbacks {
    onToken?: (token: string) => void;
    onToolCall?: (toolCall: ToolCall) => void;
    onToolExecuted?: (toolCall: ToolCall, result: string) => void;
    onFinish?: () => void;
}

export interface LLMClient {
    getCurrentModel(): string;
    setModel(model: string): void;
    getContextSize(): number;
    getAvailableModels(): Promise<string[]>;
    chat(
        messages: Message[],
        tools: Record<string, AISDKCoreTool>,
        callbacks: StreamCallbacks,
        signal?: AbortSignal,
        options?: { stream?: boolean },
    ): Promise<LLMChatResponse>;
    clearContext(): Promise<void>;
}

export interface AIProviderConfig {
    name: string;
    type: 'openai' | 'anthropic' | 'gemini' | 'openrouter';
    models: string[];
    requestTimeout?: number;
    socketTimeout?: number;
    connectionPool?: {
        idleTimeout?: number;
        cumulativeMaxIdleTimeout?: number;
    };
    config: {
        baseURL?: string;
        apiKey?: string;
        [key: string]: any;
    };
    maxRetries?: number;
}

export interface MCPServerConfig {
    command: string;
    args: string[];
    env?: Record<string, string>;
}

export interface LSPServerConfig {
    command: string;
    languages: string[];
}

export interface CoderConfig {
    coder?: {
        activeProvider?: string;
        providers: AIProviderConfig[];
        mcpServers?: Record<string, MCPServerConfig>;
        lspServers?: Record<string, LSPServerConfig>;
        telemetry?: {
            tokenUsage: boolean;
        };
        permissions?: {
            mode: 'normal' | 'plan' | 'auto-accept';
        };
    };
    // fallback for older config structure, though checking `coder` object is preferred
    providers?: AIProviderConfig[];
}
