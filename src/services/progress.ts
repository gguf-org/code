
type ProgressCallback = (message: string) => void;

/**
 * Singleton service for reporting tool execution progress
 */
class ProgressService {
    private static instance: ProgressService;
    private listeners: ProgressCallback[] = [];

    private constructor() { }

    static getInstance(): ProgressService {
        if (!ProgressService.instance) {
            ProgressService.instance = new ProgressService();
        }
        return ProgressService.instance;
    }

    /**
     * Report progress message to all listeners
     */
    report(message: string): void {
        this.listeners.forEach(listener => listener(message));
    }

    /**
     * Subscribe to progress updates
     */
    onProgress(callback: ProgressCallback): () => void {
        this.listeners.push(callback);
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Clear all listeners (useful for cleanup)
     */
    clearListeners(): void {
        this.listeners = [];
    }
}

export const progressService = ProgressService.getInstance();
