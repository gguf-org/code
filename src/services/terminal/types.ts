
/**
 * Shared terminal types and interfaces.
 */

import type { EventEmitter } from "events"

// =============================================================================
// Terminal Process Types
// =============================================================================

/**
 * Event types for terminal process
 */
export interface TerminalProcessEvents {
    line: [line: string]
    continue: []
    completed: []
    error: [error: Error]
    no_shell_integration: []
}

/**
 * Interface for terminal process implementations.
 */
export interface ITerminalProcess extends EventEmitter<TerminalProcessEvents> {
    /**
     * Whether the process is actively outputting (used to stall API requests)
     */
    isHot: boolean

    /**
     * Whether to wait for shell integration before running commands.
     */
    waitForShellIntegration: boolean

    /**
     * Continue execution without waiting for completion.
     */
    continue(): void

    /**
     * Get output that hasn't been retrieved yet.
     * @returns The unretrieved output
     */
    getUnretrievedOutput(): string

    /**
     * Terminate the process if it's still running.
     */
    terminate?(): void | Promise<void>
}

// =============================================================================
// Terminal Types
// =============================================================================

/**
 * Represents a terminal instance with its metadata and state.
 */
export interface TerminalInfo {
    /** Unique identifier for the terminal */
    id: number
    /** The underlying terminal instance */
    terminal: import("vscode").Terminal
    /** Whether the terminal is currently executing a command */
    busy: boolean
    /** The last command executed in this terminal */
    lastCommand: string
    /** The shell path used by this terminal (e.g., /bin/bash, /bin/zsh) */
    shellPath?: string
    /** Timestamp of last activity */
    lastActive: number
    /** Pending CWD change path (used for tracking directory changes) */
    pendingCwdChange?: string
    /** Promise resolver for CWD change completion */
    cwdResolved?: { resolve: () => void; reject: (err: Error) => void }
}

/**
 * Minimal terminal interface that both VSCode terminals and standalone terminals implement.
 */
export interface ITerminal {
    /** Terminal name */
    name: string
    /** Promise that resolves to the process ID */
    processId: Promise<number | undefined>
    /** Shell integration information (if available) */
    shellIntegration?: {
        cwd?: { fsPath: string }
        executeCommand?: (command: string) => {
            read: () => AsyncIterable<string>
        }
    }
    /** Send text to the terminal */
    sendText(text: string, addNewLine?: boolean): void
    /** Show the terminal */
    show(): void
    /** Hide the terminal */
    hide(): void
    /** Dispose of the terminal */
    dispose(): void
}

/**
 * Promise-like interface for terminal process results.
 */
export type TerminalProcessResultPromise = Promise<void> &
    ITerminalProcess & {
        /** Listen for line output events */
        on(event: "line", listener: (line: string) => void): TerminalProcessResultPromise
        /** Listen for completion event */
        on(event: "completed", listener: () => void): TerminalProcessResultPromise
        /** Listen for continue event */
        on(event: "continue", listener: () => void): TerminalProcessResultPromise
        /** Listen for error events */
        on(event: "error", listener: (error: Error) => void): TerminalProcessResultPromise
        /** Listen for no shell integration event */
        on(event: "no_shell_integration", listener: () => void): TerminalProcessResultPromise
        /** Listen once for any event */
        once(event: string, listener: (...args: any[]) => void): TerminalProcessResultPromise
    }

/**
 * Interface for terminal managers.
 */
export interface ITerminalManager {
    /**
     * Run a command in the specified terminal.
     */
    runCommand(terminalInfo: TerminalInfo, command: string): TerminalProcessResultPromise

    /**
     * Get or create a terminal for the specified working directory.
     */
    getOrCreateTerminal(cwd: string): Promise<TerminalInfo>

    /**
     * Get terminals filtered by busy state.
     */
    getTerminals(busy: boolean): { id: number; lastCommand: string }[]

    /**
     * Get output that hasn't been retrieved yet from a terminal.
     */
    getUnretrievedOutput(terminalId: number): string

    /**
     * Check if a terminal's process is actively outputting.
     */
    isProcessHot(terminalId: number): boolean

    /**
     * Dispose of all terminals and clean up resources.
     */
    disposeAll(): void

    /**
     * Set the timeout for waiting for shell integration.
     */
    setShellIntegrationTimeout(timeout: number): void

    /**
     * Enable or disable terminal reuse.
     */
    setTerminalReuseEnabled(enabled: boolean): void

    /**
     * Set the maximum number of output lines to keep.
     */
    setTerminalOutputLineLimit(limit: number): void

    /**
     * Set the maximum number of output lines for subagent commands.
     */
    setSubagentTerminalOutputLineLimit(limit: number): void

    /**
     * Set the default terminal profile.
     */
    setDefaultTerminalProfile(profile: string): void

    /**
     * Process output lines, potentially truncating if over limit.
     */
    processOutput(outputLines: string[], overrideLimit?: number, isSubagentCommand?: boolean): string
}
