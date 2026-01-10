
import React, { useState, useRef, useEffect } from 'react';
import { Square } from 'lucide-react';

interface InputAreaProps {
    onSend: (text: string) => void;
    onStop?: () => void;
    disabled: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({ onSend, onStop, disabled }) => {
    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (text.trim() && !disabled) {
            onSend(text.trim());
            setText('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'; // Reset height
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [text]);

    return (
        <div className="input-area">
            <div style={{ position: 'relative' }}>
                <textarea
                    ref={textareaRef}
                    className="input-box"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled && !onStop} // Only disable if no stop action available
                    placeholder={disabled ? "Code is thinking..." : "Ask Code..."}
                    rows={1}
                />
            </div>

            {disabled && onStop && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                    <button
                        onClick={onStop}
                        style={{
                            padding: '6px 16px',
                            backgroundColor: 'var(--vscode-button-secondaryBackground)',
                            color: 'var(--vscode-button-secondaryForeground)',
                            border: '1px solid var(--vscode-button-border)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <Square size={12} fill="currentColor" />
                        Stop Generating
                    </button>
                </div>
            )}

            <div style={{ fontSize: '10px', marginTop: '6px', opacity: 0.5, textAlign: 'right' }}>
                Press Enter to send, Shift+Enter for new line
            </div>
        </div>
    );
};
