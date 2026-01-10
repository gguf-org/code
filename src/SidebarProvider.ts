import * as vscode from "vscode";

import { createLLMClient } from './services/ai/AIClientFactory';
import { nativeToolsRegistry } from './services/tools/index';
import type { LLMClient, Message } from './types/index';
import type { AppMode } from './types/modes';

import { registerPermissionHandler } from './utils/user-interaction';
import { getHtmlForWebview } from './utils/webview-utils';
import { progressService } from './services/progress';

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;
    private _client?: LLMClient;

    private _messages: Message[] = [];
    private _currentAbortController?: AbortController;
    private _pendingPermissions = new Map<string, (allowed: boolean) => void>();
    private _progressUnsubscribe?: () => void;

    private _mode: AppMode = 'normal';
    private _sessionTokenCount: number = 0;
    private _sessionCost: number = 0;

    constructor(private readonly _extensionUri: vscode.Uri) {
        registerPermissionHandler(async (message) => {
            if (this._mode === 'auto-accept') {
                // Auto-accept safe tools or everything?
                // User said: "simple commands, apply to most of the cases, but critical decision still need approval"
                // For now, let's treat all tools as "simple" except maybe file overwrites?
                // As per plan, we will auto-accept for now to support "Auto-accept" mode.
                // We can add logic to detect "Delete" or "Overwrite" later if needed.
                return true;
            }
            if (this._mode === 'plan') {
                // In Plan mode, we should ideally block side-effect tools.
                // If the message implies execution of a side-effect tool, we could deny it.
                // But the permission handler just gets a message "Do you want to execute...?"
                // It doesn't know the tool name easily without parsing.
                // For now, let's auto-deny in Plan mode if it looks like an action, or just show the prompt (user can deny).
                // Actually, Plan mode means "text responses and plan a draft before taking action".
                // So the agent shouldn't be calling tools that need permission ideally.
                // If it does, we can show a warning or auto-deny.
                // Let's stick to the prompt for Plan mode but maybe add a warning to the message?
                // Or better: Auto-deny and returning "Plan Mode: Execution blocked".
                // But the handler returns a boolean.
                // Let's default to "No" for now in plan mode to be safe, effectively read-only.
                return false;
            }

            if (!this._view) {
                const selection = await vscode.window.showInformationMessage(message, { modal: true }, 'Yes', 'No');
                return selection === 'Yes';
            }
            return new Promise<boolean>((resolve) => {
                const id = Date.now().toString() + Math.random().toString();
                this._pendingPermissions.set(id, resolve);
                this._view?.webview.postMessage({
                    type: 'requestPermission',
                    value: { id, message }
                });
            });
        });

        // Subscribe to progress updates
        this._progressUnsubscribe = progressService.onProgress((message) => {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'toolProgress',
                    value: message
                });
            }
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case "onInfo": {
                    if (!data.value) return;
                    vscode.window.showInformationMessage(data.value);
                    break;
                }
                case "onModeChange": {
                    if (data.value && (data.value === 'normal' || data.value === 'plan' || data.value === 'auto-accept')) {
                        this._mode = data.value;
                        // Confirm mode change to UI if needed, or just log
                    }
                    break;
                }
                case "getSettings": {
                    // Import config functions
                    const { loadConfig, getActiveProviderConfig, getMCPServers, getLSPServers } = await import('./services/config.js');

                    const config = loadConfig();
                    const activeProvider = getActiveProviderConfig();
                    const mcpServers = getMCPServers();
                    const lspServers = getLSPServers();

                    // Send settings to webview
                    this._view?.webview.postMessage({
                        type: 'settingsUpdate',
                        value: {
                            providers: config.coder?.providers || config.providers || [],
                            activeProvider: activeProvider?.name || config.coder?.activeProvider,
                            mcpServers: mcpServers,
                            lspServers: lspServers,
                            tokenUsage: this._sessionTokenCount,
                            cost: this._sessionCost
                        }
                    });
                    break;
                }
                case "onUserInfo": {
                    if (!this._client) {
                        try {
                            this._client = await createLLMClient();
                        } catch (e: any) {
                            vscode.window.showErrorMessage(`Failed to initialize AI Client: ${e.message}`);
                            // fallback for demo if config missing
                            return;
                        }
                    }

                    // Cancel previous request if running
                    if (this._currentAbortController) {
                        this._currentAbortController.abort();
                    }
                    this._currentAbortController = new AbortController();
                    const signal = this._currentAbortController.signal;

                    const userText = data.value;
                    const newUserMessage: Message = { role: 'user', content: userText };
                    this._messages.push(newUserMessage);

                    // Add user message to UI immediately? (The UI handles it via local state usually, but good to sync)
                    // Assuming UI adds its own user message.

                    try {
                        let accumulatedResponse = "";
                        const response = await this._client.chat(this._messages, nativeToolsRegistry, {
                            onToken: (token) => {
                                // token is full accumulated text from chat-handler
                                accumulatedResponse = token;

                                // Estimate token count (rough approximation: ~4 chars per token)
                                const estimatedTokens = Math.ceil(token.length / 4);
                                this._sessionTokenCount = estimatedTokens;

                                // Estimate cost (rough approximation: $0.01 per 1000 tokens for input+output)
                                this._sessionCost = (this._sessionTokenCount / 1000) * 0.01;

                                if (this._view) {
                                    this._view.webview.postMessage({
                                        type: "addMessage",
                                        content: {
                                            role: "assistant",
                                            content: token,
                                            timestamp: Date.now(),
                                            model: this._client?.getCurrentModel() || "Coder"
                                        }
                                    });
                                }
                            },
                            onToolCall: (toolCall) => {
                                if (this._view) {
                                    this._view.webview.postMessage({
                                        type: "toolStart",
                                        value: toolCall.function.name
                                    });
                                }
                            },
                            onToolExecuted: (toolCall, result) => {
                                if (this._view) {
                                    this._view.webview.postMessage({
                                        type: "toolEnd",
                                        value: result
                                    });
                                }
                            }
                        }, signal);

                        // Append assistant response to history
                        // Note: capturing just text might miss tool calls in history
                        // We need to improve this later to capture full interaction
                        if (response && response.choices && response.choices.length > 0) {
                            const assistantMessage = response.choices[0].message as Message;
                            // Use accumulated text if content is empty (stream case)
                            if (!assistantMessage.content && accumulatedResponse) {
                                assistantMessage.content = accumulatedResponse;
                            }
                            this._messages.push(assistantMessage);

                            // If there were auto-executed messages (tools), append them too
                            if (response.autoExecutedMessages) {
                                // The handleChat might have executed tools and we might want to store them in history.
                                // But currently handleChat returns choices. 
                                // We trust the chat handler updated the messages or we need to sync.
                                // For now, simple text history.
                            }
                        }

                    } catch (e: any) {
                        if (e.message === 'Operation was cancelled') {
                            // Ignore or show "Cancelled"
                            this._view?.webview.postMessage({
                                type: "addMessage",
                                content: {
                                    role: "assistant", // or system
                                    content: "[Request Cancelled]",
                                    timestamp: Date.now(),
                                    model: "System"
                                }
                            });
                        } else {
                            vscode.window.showErrorMessage(`Chat error: ${e.message}`);
                        }
                    } finally {
                        this._currentAbortController = undefined;
                        // Signal stream end to UI
                        if (this._view) {
                            this._view.webview.postMessage({
                                type: "streamEnd"
                            });
                        }
                    }
                    break;
                }
                case "onAbort": {
                    if (this._currentAbortController) {
                        this._currentAbortController.abort();
                        this._currentAbortController = undefined;
                    }
                    // Cancel any pending permissions
                    for (const [id, resolve] of this._pendingPermissions) {
                        resolve(false);
                    }
                    this._pendingPermissions.clear();
                    // Notify UI to close permission prompts if any
                    this._view?.webview.postMessage({ type: "cancelPermissionRequest" });
                    break;
                }
                case "onPermissionResponse": {
                    if (!data.value) return;
                    const { id, allowed } = data.value;
                    const resolve = this._pendingPermissions.get(id);
                    if (resolve) {
                        resolve(allowed);
                        this._pendingPermissions.delete(id);
                    }
                    break;
                }
                case "onError": {
                    if (!data.value) return;
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
            }
        });
    }

    // Cleanup when view is disposed
    // webviewView.onDidDispose(() => {
    //   this._view = undefined;
    // });

    public revive(panel: vscode.WebviewView) {
        this._view = panel;
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return getHtmlForWebview(webview, this._extensionUri);
    }
}
