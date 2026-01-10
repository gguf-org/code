
import React from 'react';
import { X } from 'lucide-react';

export interface IExtensionConfig {
    providers?: any[];
    activeProvider?: string;
    llm?: any;
    mcpServers?: Record<string, any>;
    lspServers?: Record<string, any>;
    tokenUsage?: number;
    cost?: number;
    telemetry?: {
        tokenUsage?: boolean;
    };
    permissions?: {
        mode?: 'normal' | 'plan' | 'auto-accept';
    }
}

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
    config?: IExtensionConfig;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, config }) => {
    // Determine styles based on visibility
    const style: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        right: isOpen ? 0 : '-100%',
        bottom: 0,
        width: '85%',
        maxWidth: '320px',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 100,
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.5)', // Keep shadow
    };

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const name = e.target.value;
        const vscode = (window as any).acquireVsCodeApi ? (window as any).acquireVsCodeApi() : null;
        if (vscode) {
            vscode.postMessage({ type: 'setActiveProvider', value: name });
        }
    };

    return (
        <div style={style}>
            <div style={{
                padding: '18px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg)',
            }}>
                <span style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '0.5px', color: 'var(--fg)' }}>SETTINGS</span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: 'var(--fg)',
                        cursor: 'pointer',
                        fontSize: '18px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--vscode-toolbar-hoverBackground)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <X size={16} />
                </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                <div style={{ marginBottom: '28px' }}>
                    <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--vscode-descriptionForeground)', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.8px' }}>Provider</h4>

                    {config?.providers && config.providers.length > 0 ? (
                        <select
                            onChange={handleProviderChange}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'var(--input-bg)',
                                border: '1px solid var(--input-border)',
                                color: 'var(--input-fg)',
                                borderRadius: '2px', // VS Code style
                                outline: 'none',
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            value={config.activeProvider || ""}
                        >
                            <option value="" disabled>Select Provider</option>
                            {config.providers.map((p: any) => (
                                <option key={p.name} value={p.name}>
                                    {p.name} ({p.model || 'Default'})
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div style={{ padding: '10px 12px', background: 'var(--input-bg)', borderRadius: '2px', fontSize: '12px', color: 'var(--vscode-descriptionForeground)', border: '1px solid var(--border)' }}>
                            {config?.llm ? "Legacy Provider" : "No Providers Configured"}
                        </div>
                    )}
                </div>

                <div style={{ marginBottom: '28px' }}>
                    <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--vscode-descriptionForeground)', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.8px' }}>MCP Servers</h4>
                    {config?.mcpServers && Object.keys(config.mcpServers).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {Object.entries(config.mcpServers).map(([name, conf]) => (
                                <div key={name} style={{ fontSize: '12px', padding: '8px 10px', background: 'var(--input-bg)', borderRadius: '2px', border: '1px solid var(--border)' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{name}</span>: <span style={{ opacity: 0.8, fontSize: '11px' }}>{conf.command}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic', padding: '8px 0' }}>
                            No active servers.
                        </div>
                    )}
                </div>

                <div style={{ marginBottom: '28px' }}>
                    <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--vscode-descriptionForeground)', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.8px' }}>LSP Servers</h4>
                    {config?.lspServers && Object.keys(config.lspServers).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {Object.entries(config.lspServers).map(([name, conf]) => (
                                <div key={name} style={{ fontSize: '12px', padding: '8px 10px', background: 'var(--input-bg)', borderRadius: '2px', border: '1px solid var(--border)' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{name}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic', padding: '8px 0' }}>
                            No active LSP servers.
                        </div>
                    )}
                </div>


                <div style={{ marginBottom: '28px' }}>
                    <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--vscode-descriptionForeground)', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.8px' }}>Statistics</h4>
                    <div style={{ background: 'var(--input-bg)', padding: '12px', borderRadius: '2px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', color: 'var(--fg)' }}>
                            <span style={{ opacity: 0.8 }}>Session Tokens:</span>
                            <span style={{ fontWeight: 600, color: 'var(--vscode-textLink-foreground)' }}>{config?.tokenUsage?.toLocaleString() || 0}</span>
                        </div>
                        {config?.cost !== undefined && config.cost > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--fg)' }}>
                                <span style={{ opacity: 0.8 }}>Total Cost:</span>
                                <span style={{ fontWeight: 600, color: 'var(--vscode-debugIcon-startForeground)' }}>${config.cost.toFixed(4)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
