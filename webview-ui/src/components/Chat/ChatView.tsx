
import React, { useState, useEffect } from 'react';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { ModeSelector } from './ModeSelector';
import { SettingsMenu, IExtensionConfig } from '../Settings/SettingsMenu';
import { Message } from '../../types';
import { Code, Trash2, Settings } from 'lucide-react';

const vscode = (window as any).acquireVsCodeApi ? (window as any).acquireVsCodeApi() : null;

export const ChatView: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<string>('normal');
    const [toolStatus, setToolStatus] = useState<{ isRunning: boolean; toolName?: string; result?: string; progressMessage?: string }>({
        isRunning: false
    });
    const [permissionRequest, setPermissionRequest] = useState<{ id: string; message: string } | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [config, setConfig] = useState<IExtensionConfig | undefined>(undefined);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const msg = event.data;
            switch (msg.type) {
                case 'addMessage':
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'assistant') {
                            return [...prev.slice(0, -1), msg.content];
                        }
                        return [...prev, msg.content];
                    });
                    setIsLoading(false);
                    break;
                case 'streamEnd':
                    setIsLoading(false);
                    setToolStatus({ isRunning: false });
                    break;
                case 'toolStart':
                    setToolStatus({ isRunning: true, toolName: msg.value });
                    break;
                case 'toolEnd':
                    setToolStatus({ isRunning: false, toolName: undefined, result: msg.value });
                    break;
                case 'toolProgress':
                    setToolStatus(prev => ({ ...prev, progressMessage: msg.value }));
                    break;
                case 'requestPermission':
                    setPermissionRequest(msg.value);
                    break;
                case 'cancelPermissionRequest':
                    setPermissionRequest(null);
                    break;
                case 'settingsUpdate':
                    setConfig(msg.value);
                    break;
            }
        };
        window.addEventListener('message', handleMessage);

        // Request initial settings
        if (vscode) {
            vscode.postMessage({ type: 'getSettings' });
        }

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleSend = (text: string) => {
        const userMsg: Message = { role: 'user', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setToolStatus({ isRunning: false });
        if (vscode) {
            vscode.postMessage({ type: 'onUserInfo', value: text });
        }
    };

    const handleStop = () => {
        if (vscode) vscode.postMessage({ type: 'onAbort' });
        setIsLoading(false);
        setToolStatus({ isRunning: false });
        setPermissionRequest(null);
    };

    const handleModeChange = (newMode: string) => {
        setMode(newMode);
        if (vscode) vscode.postMessage({ type: 'onModeChange', value: newMode });
    };

    const respondPermission = (allowed: boolean) => {
        if (permissionRequest && vscode) {
            vscode.postMessage({ type: 'onPermissionResponse', value: { id: permissionRequest.id, allowed } });
        }
        setPermissionRequest(null);
    };

    // Shift + TAB shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.shiftKey && e.key === 'Tab') {
                e.preventDefault();
                setMode(prev => {
                    const modes = ['normal', 'plan', 'auto-accept'];
                    const idx = modes.indexOf(prev);
                    const next = modes[(idx + 1) % modes.length];
                    if (vscode) vscode.postMessage({ type: 'onModeChange', value: next });
                    return next;
                });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Refresh settings when opening menu
    useEffect(() => {
        if (showSettings && vscode) {
            vscode.postMessage({ type: 'getSettings' });
        }
    }, [showSettings]);

    // Local Storage Logic
    const STORAGE_KEY = 'coder_vscode_chat_history';
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        }
    }, []);
    useEffect(() => {
        if (messages.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }, [messages]);
    const handleClearHistory = () => {
        setMessages([]);
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <div className="chat-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
                background: 'var(--bg)',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Code size={18} opacity={0.8} />
                    {/* <span style={{ fontWeight: 'bold', fontSize: '14px', opacity: 0.9 }}>CODER</span> */}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={handleClearHistory}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--fg)',
                            opacity: 0.7,
                            cursor: 'pointer',
                            fontSize: '16px',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Clear History"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--fg)',
                            opacity: 0.7,
                            cursor: 'pointer',
                            fontSize: '16px',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Settings"
                    >
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            <SettingsMenu isOpen={showSettings} onClose={() => setShowSettings(false)} config={config} />

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <MessageList
                    messages={messages}
                    isLoading={isLoading}
                    toolStatus={toolStatus}
                />
            </div>

            {/* Permission Request (Inline) */}
            {permissionRequest && (
                <div style={{
                    padding: '8px 16px',
                    background: 'var(--surface)',
                    borderTop: '1px solid var(--border)',
                    color: 'var(--fg)',
                    fontSize: '11px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    flexShrink: 0
                }}>
                    <div style={{ fontWeight: 600, color: 'var(--vscode-editorError-foreground)' }}>⚠ Permission Required</div>
                    <div>{permissionRequest.message}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                            onClick={() => respondPermission(true)}
                            style={{ background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)', border: 'none', borderRadius: '3px', padding: '4px 8px', cursor: 'pointer' }}
                        >
                            Approve
                        </button>
                        <button
                            onClick={() => respondPermission(false)}
                            style={{ background: 'var(--vscode-button-secondaryBackground)', color: 'var(--vscode-button-secondaryForeground)', border: '1px solid var(--border)', borderRadius: '3px', padding: '4px 8px', cursor: 'pointer' }}
                        >
                            Deny
                        </button>
                    </div>
                </div>
            )}

            {/* Input & Mode */}
            <InputArea
                onSend={handleSend}
                onStop={handleStop}
                disabled={isLoading || toolStatus.isRunning}
            />

            <ModeSelector
                currentMode={mode}
                onModeChange={handleModeChange}
                disabled={isLoading}
            />
        </div>
    );
};
