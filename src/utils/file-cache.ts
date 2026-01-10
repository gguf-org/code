import * as vscode from 'vscode';
import { CACHE_FILE_TTL_MS, MAX_FILE_READ_RETRIES } from '../constants';

// Simplified file cache port for VSCode extension
export const MAX_CACHE_SIZE = 50;

export interface CachedFile {
    content: string;
    lines: string[];
    mtime: number;
    cachedAt: number;
}

interface CacheEntry {
    data: CachedFile;
    accessOrder: number;
}

const cache = new Map<string, CacheEntry>();
let accessCounter = 0;
const pendingReads = new Map<string, Promise<CachedFile>>();

export async function getCachedFileContent(
    absPath: string,
): Promise<CachedFile> {
    const now = Date.now();
    const entry = cache.get(absPath);

    if (entry) {
        const { data } = entry;

        if (now - data.cachedAt > CACHE_FILE_TTL_MS) {
            cache.delete(absPath);
        } else {
            try {
                const uri = vscode.Uri.file(absPath);
                const fileStat = await vscode.workspace.fs.stat(uri);
                const currentMtime = fileStat.mtime;

                if (currentMtime === data.mtime) {
                    entry.accessOrder = ++accessCounter;
                    return data;
                }
                cache.delete(absPath);

                let pending = pendingReads.get(absPath);
                if (!pending) {
                    pending = readAndCacheFile(absPath, now, currentMtime);
                    pendingReads.set(absPath, pending);
                }

                try {
                    return await pending;
                } finally {
                    pendingReads.delete(absPath);
                }
            } catch {
                cache.delete(absPath);
            }
        }
    }

    const pending = pendingReads.get(absPath);
    if (pending) {
        return pending;
    }

    const readPromise = readAndCacheFile(absPath, now);
    pendingReads.set(absPath, readPromise);

    try {
        return await readPromise;
    } finally {
        pendingReads.delete(absPath);
    }
}

async function readAndCacheFile(
    absPath: string,
    now: number,
    knownMtime?: number,
    retryCount = 0,
): Promise<CachedFile> {
    const uri = vscode.Uri.file(absPath);
    const mtimeBefore = knownMtime ?? (await vscode.workspace.fs.stat(uri)).mtime;

    // Add 5s timeout for file reading to prevent hangs
    const readWithTimeout = Promise.race([
        vscode.workspace.fs.readFile(uri).then(bytes => new TextDecoder().decode(bytes)),
        new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('File read timed out')), 5000)
        )
    ]);

    const content = await readWithTimeout;
    const mtimeAfter = (await vscode.workspace.fs.stat(uri)).mtime;
    if (mtimeAfter !== mtimeBefore) {
        if (retryCount >= MAX_FILE_READ_RETRIES) {
            throw new Error(
                `File ${absPath} is being modified too frequently, giving up after ${MAX_FILE_READ_RETRIES} retries`,
            );
        }
        return readAndCacheFile(absPath, Date.now(), undefined, retryCount + 1);
    }

    const cachedFile: CachedFile = {
        content,
        lines: content.split('\n'),
        mtime: mtimeAfter,
        cachedAt: now,
    };

    if (cache.size >= MAX_CACHE_SIZE) {
        evictLRU();
    }

    cache.set(absPath, {
        data: cachedFile,
        accessOrder: ++accessCounter,
    });

    return cachedFile;
}

export function invalidateCache(absPath: string): void {
    cache.delete(absPath);
}

export function clearCache(): void {
    cache.clear();
    pendingReads.clear();
    accessCounter = 0;
}

function evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestOrder = Infinity;

    for (const [key, entry] of cache) {
        if (entry.accessOrder < oldestOrder) {
            oldestOrder = entry.accessOrder;
            oldestKey = key;
        }
    }

    if (oldestKey) {
        cache.delete(oldestKey);
    }
}
