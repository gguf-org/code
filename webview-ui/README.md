# VS Code Webview UI

This directory contains the React application used for the Coder VS Code extension sidebar.

## Development

- **Build**: `npm run build:webview` (from parent directory)
- **Watch**: `npm run watch:webview` (from parent directory)

## Structure

- `src/main.tsx`: Entry point.
- `src/components/`: React components.
- `src/types.ts`: Shared types.

## Message Passing

Messages are passed between the Webview and the Extension Host using `vscode.postMessage` and `window.addEventListener('message')`.

### Webview -> Extension
```typescript
vscode.postMessage({ type: 'onUserInfo', value: 'Hello' });
```

### Extension -> Webview
```typescript
activeWebview.postMessage({ type: 'addMessage', content: ... });
```
