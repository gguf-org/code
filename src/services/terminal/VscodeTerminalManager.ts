
import * as vscode from "vscode"
import * as path from "path"
import { TerminalRegistry } from "./VscodeTerminalRegistry"
import { VscodeTerminalProcess, mergePromise } from "./VscodeTerminalProcess"
import type { ITerminalManager, TerminalProcessResultPromise, TerminalInfo } from "./types"

// Helper for arePathsEqual
function normalizePath(p: string): string {
    let normalized = path.normalize(p)
    if (normalized.length > 1 && (normalized.endsWith("/") || normalized.endsWith("\\"))) {
        normalized = normalized.slice(0, -1)
    }
    return normalized
}

function arePathsEqual(path1?: string, path2?: string): boolean {
    if (!path1 && !path2) {
        return true
    }
    if (!path1 || !path2) {
        return false
    }

    path1 = normalizePath(path1)
    path2 = normalizePath(path2)

    if (process.platform === "win32") {
        return path1.toLowerCase() === path2.toLowerCase()
    }
    return path1 === path2
}

// Helper for p-wait-for
async function pWaitFor(condition: () => boolean | Promise<boolean>, options: { timeout: number }): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < options.timeout) {
        if (await condition()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error("Timeout");
}

export class VscodeTerminalManager implements ITerminalManager {
    private terminalIds: Set<number> = new Set()
    private processes: Map<number, VscodeTerminalProcess> = new Map()
    private disposables: vscode.Disposable[] = []
    private shellIntegrationTimeout: number = 4000
    private terminalReuseEnabled: boolean = true
    private terminalOutputLineLimit: number = 500
    private subagentTerminalOutputLineLimit: number = 2000
    private defaultTerminalProfile: string = "default"

    constructor() {
        let disposable: vscode.Disposable | undefined
        try {
            disposable = (vscode.window as any).onDidStartTerminalShellExecution?.(async (e: any) => {
                // Creating a read stream here results in a more consistent output.
                e?.execution?.read()
            })
        } catch (_error) {
            // console.error("Error setting up onDidEndTerminalShellExecution", error)
        }
        if (disposable) {
            this.disposables.push(disposable)
        }

        // Add a listener for terminal state changes to detect CWD updates
        try {
            const stateChangeDisposable = vscode.window.onDidChangeTerminalState((terminal) => {
                const terminalInfo = this.findTerminalInfoByTerminal(terminal)
                if (terminalInfo && terminalInfo.pendingCwdChange && terminalInfo.cwdResolved) {
                    // Check if CWD has been updated to match the expected path
                    if (this.isCwdMatchingExpected(terminalInfo)) {
                        const resolver = terminalInfo.cwdResolved.resolve
                        terminalInfo.pendingCwdChange = undefined
                        terminalInfo.cwdResolved = undefined
                        resolver()
                    }
                }
            })
            this.disposables.push(stateChangeDisposable)
        } catch (error) {
            console.error("Error setting up onDidChangeTerminalState", error)
        }
    }

    //Find a TerminalInfo by its VSCode Terminal instance
    private findTerminalInfoByTerminal(terminal: vscode.Terminal): TerminalInfo | undefined {
        const terminals = TerminalRegistry.getAllTerminals()
        return terminals.find((t) => t.terminal === terminal)
    }

    //Check if a terminal's CWD matches its expected pending change
    private isCwdMatchingExpected(terminalInfo: TerminalInfo): boolean {
        if (!terminalInfo.pendingCwdChange) {
            return false
        }

        const currentCwd = terminalInfo.terminal.shellIntegration?.cwd?.fsPath
        const targetCwd = vscode.Uri.file(terminalInfo.pendingCwdChange).fsPath

        if (!currentCwd) {
            return false
        }

        return arePathsEqual(currentCwd, targetCwd)
    }

    runCommand(terminalInfo: TerminalInfo, command: string): TerminalProcessResultPromise {
        const vscodeTerminalInfo = terminalInfo
        console.log(`[TerminalManager] Running command on terminal ${vscodeTerminalInfo.id}: "${command}"`)

        vscodeTerminalInfo.busy = true
        vscodeTerminalInfo.lastCommand = command
        const process = new VscodeTerminalProcess()
        this.processes.set(vscodeTerminalInfo.id, process)

        process.once("completed", () => {
            console.log(`[TerminalManager] Terminal ${vscodeTerminalInfo.id} completed, setting busy to false`)
            vscodeTerminalInfo.busy = false
        })

        // if shell integration is not available, remove terminal so it does not get reused
        process.once("no_shell_integration", () => {
            console.log(`no_shell_integration received for terminal ${vscodeTerminalInfo.id}`)
            TerminalRegistry.removeTerminal(vscodeTerminalInfo.id)
            this.terminalIds.delete(vscodeTerminalInfo.id)
            this.processes.delete(vscodeTerminalInfo.id)
        })

        const promise = new Promise<void>((resolve, reject) => {
            process.once("continue", () => {
                resolve()
            })
            process.once("error", (error) => {
                console.error(`Error in terminal ${vscodeTerminalInfo.id}:`, error)
                reject(error)
            })
        })

        // if shell integration is already active, run the command immediately
        if (vscodeTerminalInfo.terminal.shellIntegration) {
            process.waitForShellIntegration = false
            process.run(vscodeTerminalInfo.terminal, command)
        } else {
            // docs recommend waiting 3s for shell integration to activate
            console.log(
                `[TerminalManager Test] Waiting for shell integration for terminal ${vscodeTerminalInfo.id} with timeout ${this.shellIntegrationTimeout}ms`,
            )
            pWaitFor(() => vscodeTerminalInfo.terminal.shellIntegration !== undefined, {
                timeout: this.shellIntegrationTimeout,
            })
                .then(() => {
                    console.log(
                        `[TerminalManager Test] Shell integration activated for terminal ${vscodeTerminalInfo.id} within timeout.`,
                    )
                })
                .catch((err) => {
                    console.warn(
                        `[TerminalManager Test] Shell integration timed out or failed for terminal ${vscodeTerminalInfo.id}: ${err.message}`,
                    )
                })
                .finally(() => {
                    console.log(`[TerminalManager Test] Proceeding with command execution for terminal ${vscodeTerminalInfo.id}.`)
                    const existingProcess = this.processes.get(vscodeTerminalInfo.id)
                    if (existingProcess && existingProcess.waitForShellIntegration) {
                        existingProcess.waitForShellIntegration = false
                        existingProcess.run(vscodeTerminalInfo.terminal, command)
                    }
                })
        }

        return mergePromise(process, promise)
    }

    async getOrCreateTerminal(cwd: string): Promise<TerminalInfo> {
        const terminals = TerminalRegistry.getAllTerminals()
        // Simple shell check (ignore profile for now)
        const expectedShellPath = undefined

        // Find available terminal from our pool first (created for this task)
        console.log(`[TerminalManager] Looking for terminal in cwd: ${cwd}`)
        console.log(`[TerminalManager] Available terminals: ${terminals.length}`)

        const matchingTerminal = terminals.find((t) => {
            if (t.busy) {
                console.log(`[TerminalManager] Terminal ${t.id} is busy, skipping`)
                return false
            }
            const terminalCwd = t.terminal.shellIntegration?.cwd
            if (!terminalCwd) {
                console.log(`[TerminalManager] Terminal ${t.id} has no cwd, skipping`)
                return false
            }
            const matches = arePathsEqual(vscode.Uri.file(cwd).fsPath, terminalCwd.fsPath)
            console.log(`[TerminalManager] Terminal ${t.id} cwd: ${terminalCwd.fsPath}, matches: ${matches}`)
            return matches
        })
        if (matchingTerminal) {
            console.log(`[TerminalManager] Found matching terminal ${matchingTerminal.id} in correct cwd`)
            this.terminalIds.add(matchingTerminal.id)
            return matchingTerminal
        }

        // If no non-busy terminal in the current working dir exists and terminal reuse is enabled, try to find any non-busy terminal regardless of CWD
        if (this.terminalReuseEnabled) {
            const availableTerminal = terminals.find((t) => !t.busy)
            if (availableTerminal) {
                // Set up promise and tracking for CWD change
                const cwdPromise = new Promise<void>((resolve, reject) => {
                    availableTerminal.pendingCwdChange = cwd
                    availableTerminal.cwdResolved = { resolve, reject }
                })

                // Navigate back to the desired directory
                const cdProcess = this.runCommand(availableTerminal, `cd "${cwd}"`)

                // Wait for the cd command to complete before proceeding
                await cdProcess

                // Add a small delay to ensure terminal is ready after cd
                await new Promise((resolve) => setTimeout(resolve, 100))

                // Either resolve immediately if CWD already updated or wait for event/timeout
                if (this.isCwdMatchingExpected(availableTerminal)) {
                    if (availableTerminal.cwdResolved) {
                        availableTerminal.cwdResolved.resolve()
                    }
                    availableTerminal.pendingCwdChange = undefined
                    availableTerminal.cwdResolved = undefined
                } else {
                    try {
                        // Wait with a timeout for state change event to resolve
                        await Promise.race([
                            cwdPromise,
                            new Promise<void>((_, reject) =>
                                setTimeout(() => reject(new Error(`CWD timeout: Failed to update to ${cwd}`)), 1000),
                            ),
                        ])
                    } catch (_err) {
                        // Clear pending state on timeout
                        availableTerminal.pendingCwdChange = undefined
                        availableTerminal.cwdResolved = undefined
                    }
                }
                this.terminalIds.add(availableTerminal.id)
                return availableTerminal
            }
        }

        // If all terminals are busy, create a new one
        const newTerminalInfo = TerminalRegistry.createTerminal(cwd, expectedShellPath)
        this.terminalIds.add(newTerminalInfo.id)
        return newTerminalInfo
    }

    getTerminals(busy: boolean): { id: number; lastCommand: string }[] {
        return Array.from(this.terminalIds)
            .map((id) => TerminalRegistry.getTerminal(id))
            .filter((t): t is TerminalInfo => t !== undefined && t.busy === busy)
            .map((t) => ({ id: t.id, lastCommand: t.lastCommand }))
    }

    getUnretrievedOutput(terminalId: number): string {
        if (!this.terminalIds.has(terminalId)) {
            return ""
        }
        const process = this.processes.get(terminalId)
        return process ? process.getUnretrievedOutput() : ""
    }

    isProcessHot(terminalId: number): boolean {
        const process = this.processes.get(terminalId)
        return process ? process.isHot : false
    }

    disposeAll() {
        this.terminalIds.clear()
        this.processes.clear()
        this.disposables.forEach((disposable) => disposable.dispose())
        this.disposables = []
    }

    setShellIntegrationTimeout(timeout: number): void {
        this.shellIntegrationTimeout = timeout
    }

    setTerminalReuseEnabled(enabled: boolean): void {
        this.terminalReuseEnabled = enabled
    }

    setTerminalOutputLineLimit(limit: number): void {
        this.terminalOutputLineLimit = limit
    }

    setSubagentTerminalOutputLineLimit(limit: number): void {
        this.subagentTerminalOutputLineLimit = limit
    }

    public processOutput(outputLines: string[], overrideLimit?: number, isSubagentCommand?: boolean): string {
        const limit = isSubagentCommand
            ? overrideLimit !== undefined
                ? overrideLimit
                : this.subagentTerminalOutputLineLimit
            : this.terminalOutputLineLimit
        if (outputLines.length > limit) {
            const halfLimit = Math.floor(limit / 2)
            const start = outputLines.slice(0, halfLimit)
            const end = outputLines.slice(outputLines.length - halfLimit)
            return `${start.join("\n")}\n... (output truncated) ...\n${end.join("\n")}`.trim()
        }
        return outputLines.join("\n").trim()
    }

    setDefaultTerminalProfile(profileId: string): void {
        this.defaultTerminalProfile = profileId
    }
}
