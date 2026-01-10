import * as vscode from 'vscode';


type PermissionHandler = (message: string) => Promise<boolean>;

let permissionHandler: PermissionHandler | undefined;

export function registerPermissionHandler(handler: PermissionHandler) {
    permissionHandler = handler;
}

export async function askUserPermission(message: string): Promise<boolean> {
    if (permissionHandler) {
        return permissionHandler(message);
    }
    const selection = await vscode.window.showInformationMessage(
        message,
        { modal: true },
        'Yes',
        'No'
    );
    return selection === 'Yes';
}
