
import React, { useState, useEffect } from 'react';

interface ToolStatusProps {
    toolName?: string;
    progressMessage?: string;
}

export const ToolStatus: React.FC<ToolStatusProps> = ({ toolName, progressMessage }) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div style={{ marginTop: '10px', padding: '0 10px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
            <div className="tool-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--fg)', fontSize: '12px' }}>
                    <span>Executing: <span style={{ fontWeight: 600, color: 'var(--vscode-textLink-foreground)' }}>{toolName || 'Unknown Tool'}</span></span>
                    <span className="loading-dots"></span>
                </div>
                <div style={{
                    fontSize: '10px',
                    opacity: 0.8,
                    background: 'var(--vscode-badge-background)',
                    color: 'var(--vscode-badge-foreground)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    minWidth: '24px',
                    textAlign: 'center'
                }}>
                    {seconds}s
                </div>
            </div>
            {progressMessage && (
                <div style={{
                    fontSize: '11px',
                    color: 'var(--vscode-descriptionForeground)',
                    marginTop: '6px',
                    fontStyle: 'italic',
                    paddingLeft: '4px'
                }}>
                    {progressMessage}
                </div>
            )}
            <div className="loading-bar-container" style={{ marginTop: '8px' }}>
                <div className="loading-bar-fill"></div>
            </div>
        </div>
    );
};
