
import React from 'react';

export const ModeSelector: React.FC<{
    currentMode: string;
    onModeChange: (mode: string) => void;
    disabled?: boolean;
}> = ({ currentMode, onModeChange, disabled }) => {
    return (
        <div style={{
            padding: '4px 12px',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '11px',
            borderTop: '1px solid var(--border)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="mode-select" style={{ fontWeight: 600, color: 'var(--fg)' }}>MODE</label>
                <select
                    id="mode-select"
                    value={currentMode}
                    onChange={(e) => onModeChange(e.target.value)}
                    disabled={disabled}
                    style={{
                        background: 'var(--input-bg)',
                        color: 'var(--input-fg)',
                        border: '1px solid var(--input-border)',
                        borderRadius: '3px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        outline: 'none',
                        cursor: 'pointer',
                        appearance: 'none', // Remove default arrow if possible in webview
                        height: '20px'
                    }}
                >
                    <option value="normal">Normal</option>
                    <option value="plan">Plan</option>
                    <option value="auto-accept">Auto-Accept</option>
                </select>
            </div>

            <span style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '9px' }}>Shift+TAB to switch</span>
        </div>
    );
};
