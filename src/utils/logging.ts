import * as vscode from 'vscode';

export function getLogger() {
    // A simple logger wrapper around VS Code output channel
    // In a real app we might want a singleton managed by the extension context
    return {
        info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta),
        debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta),
        error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta),
        warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta),
    };
}

export function startMetrics() {
    return { startTime: Date.now() };
}

export function endMetrics(metrics: { startTime: number }) {
    return {
        duration: Date.now() - metrics.startTime,
        memoryUsage: process.memoryUsage()
    };
}

export function formatMemoryUsage(usage: NodeJS.MemoryUsage) {
    return `${Math.round(usage.heapUsed / 1024 / 1024)}MB`;
}

export function getCorrelationId() {
    return 'correlation-id'; // placeholder
}

export function generateCorrelationId() {
    return 'new-correlation-id'; // placeholder
}

export async function withNewCorrelationContext<T>(fn: (context: any) => Promise<T>, correlationId?: string): Promise<T> {
    return await fn({});
}
