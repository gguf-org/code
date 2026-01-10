import { AISDKClient } from './AISDKClient';
import { loadConfig } from '../config';
import type { AIProviderConfig, LLMClient } from '../../types/index';

export async function createLLMClient(): Promise<LLMClient> {
    const config = loadConfig();

    // Parse providers from config
    const providers: AIProviderConfig[] = [];
    // Support both old (nested) and new (flat) config structures
    // User requested "old" scheme: { "coder": { "providers": [...] } }
    const rawProviders = config.coder?.providers || config.providers;

    if (rawProviders) {
        for (const provider of rawProviders) {
            providers.push({
                name: provider.name,
                type: provider.type || 'openrouter', // default to openrouter if not specified
                models: provider.models || [],
                config: {
                    baseURL: provider.baseUrl,
                    apiKey: provider.apiKey,
                },
                maxRetries: provider.maxRetries
            });
        }
    }

    if (providers.length === 0) {
        throw new Error('No providers configured in coder.config.json');
    }

    // Use first provider for now
    // In a real app we'd allow selecting provider
    return await AISDKClient.create(providers[0]);
}
