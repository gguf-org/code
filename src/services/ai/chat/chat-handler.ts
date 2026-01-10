
import { MAX_TOOL_STEPS } from '../../../constants';
import type {
    AIProviderConfig,
    AISDKCoreTool,
    LLMChatResponse,
    Message,
    StreamCallbacks,
    ToolCall,
} from '../../../types/index';
import {
    endMetrics,
    formatMemoryUsage,
    generateCorrelationId,
    getCorrelationId,
    getLogger,
    startMetrics,
    withNewCorrelationContext,
} from '../../../utils/logging';
import type { LanguageModel } from 'ai';
import { generateText, streamText } from 'ai';

export interface ChatHandlerParams {
    model: LanguageModel;
    currentModel: string;
    providerConfig: AIProviderConfig;
    messages: Message[];
    tools: Record<string, AISDKCoreTool>;
    callbacks: StreamCallbacks;
    signal?: AbortSignal;
    maxRetries: number;
    stream?: boolean;
}

export async function handleChat(
    params: ChatHandlerParams,
): Promise<LLMChatResponse> {
    const {
        model,
        currentModel,
        providerConfig,
        messages,
        tools,
        callbacks,
        signal,
        maxRetries,
        stream = true,
    } = params;
    const logger = getLogger();

    if (signal?.aborted) {
        throw new Error('Operation was cancelled');
    }

    const metrics = startMetrics();
    const correlationId = getCorrelationId() || generateCorrelationId();

    logger.info('Chat request starting', {
        model: currentModel,
        messageCount: messages.length,
    });

    return await withNewCorrelationContext(async _context => {
        try {
            const aiTools = Object.keys(tools).length > 0 ? tools : undefined;
            // Conversion to AI SDK messages needed here if format differs
            // For now assuming Message is compatible or we just pass it (might need casting)
            const modelMessages = messages as any;

            let fullText = '';
            const aiSdkParams = {
                model,
                messages: modelMessages,
                tools: aiTools,
                abortSignal: signal,
                maxRetries,
                maxSteps: MAX_TOOL_STEPS,
            };

            if (stream) {
                const result = streamText(aiSdkParams);

                for await (const part of result.fullStream) {
                    switch (part.type) {
                        case 'text-delta':
                            fullText += (part as any).textDelta ?? (part as any).text ?? "";
                            callbacks.onToken?.(fullText);
                            break;
                        case 'tool-call':
                            // type 'tool-call' generally has 'args' in recent AI SDK versions
                            // but based on lint feedback, it seems to have 'input'
                            callbacks.onToolCall?.({
                                id: part.toolCallId,
                                function: {
                                    name: part.toolName,
                                    arguments: (part as any).args ?? (part as any).input
                                }
                            });
                            break;
                        case 'tool-result':
                            // type 'tool-result' generally has 'result' in recent AI SDK versions
                            // but based on lint feedback, it seems to have 'output' and 'input'
                            callbacks.onToolExecuted?.({
                                id: part.toolCallId,
                                function: {
                                    name: part.toolName,
                                    arguments: (part as any).args ?? (part as any).input
                                }
                            },
                                typeof (part as any).result === 'string'
                                    ? (part as any).result
                                    : JSON.stringify((part as any).result ?? (part as any).output)
                            );
                            break;
                    }
                }

                logger.info('Stream completed');

                // Return simple response for now
                return {
                    choices: [{
                        message: {
                            role: 'assistant',
                            content: fullText,
                            // tool_calls: ...
                        }
                    }]
                };

            } else {
                const result = await generateText(aiSdkParams);
                fullText = result.text;
                return {
                    choices: [{
                        message: {
                            role: 'assistant',
                            content: fullText,
                        }
                    }]
                };
            }
        } catch (error) {
            logger.error('Chat request failed', { error });
            throw error;
        }
    }, correlationId);
}
