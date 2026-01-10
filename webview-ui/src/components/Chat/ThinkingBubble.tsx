
import React, { useState, useEffect } from 'react';

export const ThinkingBubble: React.FC = () => {
    const [seconds, setSeconds] = useState(0);
    const [phaseIndex, setPhaseIndex] = useState(0);

    // Phrases to cycle through to make it feel dynamic
    const phrases = ["Thinking", "Analyzing", "Reading", "Processing", "Generating"];

    useEffect(() => {
        const timer = setInterval(() => {
            setSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const phaseTimer = setInterval(() => {
            setPhaseIndex(i => (i + 1) % phrases.length);
        }, 4000); // Change phrase every 4 seconds
        return () => clearInterval(phaseTimer);
    }, []);

    return (
        <div className="message-item assistant">
            <div className="message-bubble" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                // Subtle gradient for premium feel
                background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg) 100%)',
                border: '1px solid var(--primary)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                {/* Spinner-like animation or just dots? User asked for text animation. */}
                <div style={{
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--fg)'
                }}>
                    <span>{phrases[phaseIndex]}</span>
                    <span className="loading-dots"></span>
                </div>

                {/* Timer pill */}
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
        </div>
    );
};
