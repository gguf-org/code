import * as vscode from "vscode";

export function getNonce() {
    let text = "";
    const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export function getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const styleResetUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, "webview-ui", "src", "index.css")
    );
    // Point to the built files in dist/webview
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, "dist", "webview", "index.js")
    );
    const styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, "dist", "webview", "index.css")
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleResetUri}" rel="stylesheet">
        <link href="${styleUri}" rel="stylesheet">
        <title>Coder</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
}
