
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../../types';

interface MessageItemProps {
    message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
    const isUser = message.role === 'user';
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className={`message-item ${isUser ? 'user' : 'assistant'} ${isCollapsed ? 'collapsed' : ''}`}>
            <div
                style={{
                    marginBottom: '4px',
                    fontSize: '11px',
                    opacity: 0.6,
                    paddingLeft: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    userSelect: 'none'
                }}
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <span>{isCollapsed ? '▶' : '▼'}</span>
                <span>{isUser ? 'You' : (message.model || 'Code')}</span>
            </div>

            {!isCollapsed && (
                <div className="message-bubble markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    );
};
