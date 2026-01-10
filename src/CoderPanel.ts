import * as vscode from "vscode";
import { createLLMClient } from './services/ai/AIClientFactory';
import { nativeToolsRegistry } from './services/tools/index';
import type { LLMClient, Message } from './types/index';
import type { AppMode } from './types/modes';
import { registerPermissionHandler } from './utils/user-interaction';
import { getHtmlForWebview } from './utils/webview-utils';

export class CoderPanel {
    public static currentPanel: CoderPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _client?: LLMClient;
    private _messages: Message[] = [];
    private _currentAbortController?: AbortController;
    private _pendingPermissions = new Map<string, (allowed: boolean) => void>();
    private _mode: AppMode = 'normal';
    private _sessionTokenCount: number = 0;
    private _sessionCost: number = 0;

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.ViewColumn.Beside;

        if (CoderPanel.currentPanel) {
            CoderPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'coder.panel',
            'Coder',
            column,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        CoderPanel.currentPanel = new CoderPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._panel.webview.html = getHtmlForWebview(this._panel.webview, this._extensionUri);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                await this._handleMessage(message);
            },
            null,
            this._disposables
        );

        this._registerPermissionHandler();
    }

    private _registerPermissionHandler() {
        registerPermissionHandler(async (message) => {
            if (this._mode === 'auto-accept') {
                return true;
            }
            if (this._mode === 'plan') {
                return false;
            }

            // Since we are in a panel, we can use the panel messaging or window message
            // If panel is not visible, this might be tricky, but assuming user is interacting.
            return new Promise<boolean>((resolve) => {
                const id = Date.now().toString() + Math.random().toString();
                this._pendingPermissions.set(id, resolve);
                this._panel.webview.postMessage({
                    type: 'requestPermission',
                    value: { id, message }
                });
            });
        });
    }

    private async _handleMessage(data: any) {
        const webview = this._panel.webview;
        switch (data.type) {
            case "onInfo": {
                if (!data.value) return;
                vscode.window.showInformationMessage(data.value);
                break;
            }
            case "onModeChange": {
                if (data.value && (data.value === 'normal' || data.value === 'plan' || data.value === 'auto-accept')) {
                    this._mode = data.value;
                }
                break;
            }
            case "getSettings": {
                const { loadConfig, getActiveProviderConfig, getMCPServers, getLSPServers } = await import('./services/config.js');

                const config = loadConfig();
                const activeProvider = getActiveProviderConfig();
                const mcpServers = getMCPServers();
                const lspServers = getLSPServers();

                webview.postMessage({
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
                        return;
                    }
                }

                if (this._currentAbortController) {
                    this._currentAbortController.abort();
                }
                this._currentAbortController = new AbortController();
                const signal = this._currentAbortController.signal;

                const userText = data.value;
                const newUserMessage: Message = { role: 'user', content: userText };
                this._messages.push(newUserMessage);

                try {
                    let accumulatedResponse = "";
                    const response = await this._client.chat(this._messages, nativeToolsRegistry, {
                        onToken: (token) => {
                            accumulatedResponse = token;
                            const estimatedTokens = Math.ceil(token.length / 4);
                            this._sessionTokenCount = estimatedTokens;
                            this._sessionCost = (this._sessionTokenCount / 1000) * 0.01;

                            webview.postMessage({
                                type: "addMessage",
                                content: {
                                    role: "assistant",
                                    content: token,
                                    timestamp: Date.now(),
                                    model: this._client?.getCurrentModel() || "Coder"
                                }
                            });
                        },
                        onToolCall: (toolCall) => {
                            webview.postMessage({
                                type: "toolStart",
                                value: toolCall.function.name
                            });
                        },
                        onToolExecuted: (toolCall, result) => {
                            webview.postMessage({
                                type: "toolEnd",
                                value: result
                            });
                        }
                    }, signal);

                    if (response && response.choices && response.choices.length > 0) {
                        const assistantMessage = response.choices[0].message as Message;
                        if (!assistantMessage.content && accumulatedResponse) {
                            assistantMessage.content = accumulatedResponse;
                        }
                        this._messages.push(assistantMessage);
                    }

                } catch (e: any) {
                    if (e.message === 'Operation was cancelled') {
                        webview.postMessage({
                            type: "addMessage",
                            content: {
                                role: "assistant",
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
                    webview.postMessage({
                        type: "streamEnd"
                    });
                }
                break;
            }
            case "onAbort": {
                if (this._currentAbortController) {
                    this._currentAbortController.abort();
                    this._currentAbortController = undefined;
                }
                for (const [id, resolve] of this._pendingPermissions) {
                    resolve(false);
                }
                this._pendingPermissions.clear();
                webview.postMessage({ type: "cancelPermissionRequest" });
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
    }

    public dispose() {
        CoderPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}
