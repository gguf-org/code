
import React, { useEffect, useRef } from 'react';
import { Message } from '../../types';
import { MessageItem } from './MessageItem';
import { ThinkingBubble } from './ThinkingBubble';
import { ToolStatus } from './ToolStatus';

interface MessageListProps {
    messages: Message[];
    isLoading: boolean;
    toolStatus?: { isRunning: boolean; toolName?: string; progressMessage?: string };
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, toolStatus }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading, toolStatus]);

    return (
        <div className="message-list">
            {messages.map((msg, idx) => (
                <MessageItem key={idx} message={msg} />
            ))}

            {isLoading && <ThinkingBubble />}

            {toolStatus?.isRunning && <ToolStatus toolName={toolStatus.toolName} progressMessage={toolStatus.progressMessage} />}

            <div ref={bottomRef} />
        </div>
    );
};
