export interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    model?: string;
    timestamp: number;
}

export interface ChatState {
    messages: Message[];
    isLoading: boolean;
    toolStatus?: {
        isRunning: boolean;
        toolName?: string;
        result?: string;
    };
}
