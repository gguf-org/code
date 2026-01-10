# Progress Reporting Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         TOOL LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  execute-bash.ts    web-search.ts    read-file.ts               │
│  write-file.ts      string-replace.ts    etc...                 │
│                                                                 │
│  Each tool calls:                                               │
│  progressService.report("Status message")                       │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROGRESS SERVICE                             │
│                   (Singleton Pattern)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  - Maintains list of listeners                                  │
│  - Broadcasts messages to all subscribers                       │
│  - Provides cleanup functionality                               │
│                                                                 │
│  Methods:                                                       │
│  • report(message: string)                                      │
│  • onProgress(callback: Function): UnsubscribeFn                │
│  • clearListeners()                                             │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SIDEBAR PROVIDER                              │
│                  (Extension Backend)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Constructor subscribes to ProgressService:                     │
│                                                                 │
│  this._progressUnsubscribe = progressService.onProgress(        │
│    (message) => {                                               │
│      this._view.webview.postMessage({                           │
│        type: 'toolProgress',                                    │
│        value: message                                           │
│      });                                                        │
│    }                                                            │
│  );                                                             │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ (postMessage)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      WEBVIEW UI                                 │
│                    (React Frontend)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ChatView.tsx                                                   │
│  ├─ Listens for 'toolProgress' messages                         │
│  ├─ Updates toolStatus state:                                   │
│  │  { isRunning, toolName, progressMessage }                    │
│  └─ Passes to MessageList component                             │
│                                                                 │
│  MessageList.tsx                                                │
│  ├─ Displays tool name                                          │
│  ├─ Shows progress message (italic, muted)                      │
│  └─ Renders animated loading bar                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### ProgressService (`src/services/progress.ts`)
- **Single Source of Truth** for all progress updates
- **Decoupled Design**: Tools don't need to know about UI
- **Flexible**: Easy to add new subscribers (e.g., status bar, notifications)

### Tools (`src/services/tools/*.ts`)
- **Report Progress**: Call `progressService.report()` at key points
- **No UI Coupling**: Don't need to know about webview or React
- **Granular Updates**: Report different phases of execution

### SidebarProvider (`src/SidebarProvider.ts`)
- **Bridge**: Connects backend (ProgressService) to frontend (Webview)
- **Message Forwarding**: Translates progress events to webview messages
- **Lifecycle Management**: Subscribes on creation, cleans up on disposal

### ChatView (`webview-ui/src/components/Chat/ChatView.tsx`)
- **State Management**: Maintains toolStatus with progress info
- **Message Handling**: Processes 'toolProgress' messages from extension
- **Props Passing**: Sends toolStatus to MessageList

### MessageList (`webview-ui/src/components/Chat/MessageList.tsx`)
- **Visual Rendering**: Displays tool status and progress
- **User Feedback**: Shows loading bar and status text
- **Real-time Updates**: Re-renders on toolStatus changes

## Message Types

### Extension → Webview
```typescript
{
  type: 'toolProgress',
  value: string  // Progress message
}

{
  type: 'toolStart',
  value: string  // Tool name
}

{
  type: 'toolEnd',
  value: string  // Result
}

{
  type: 'streamEnd'
}
```

## Benefits of This Architecture

✅ **Separation of Concerns**: Tools, service, UI are independent
✅ **Testable**: Each component can be tested in isolation
✅ **Extensible**: Easy to add new tools or UI elements
✅ **Maintainable**: Clear data flow and responsibilities
✅ **Performant**: Minimal overhead, efficient message passing
✅ **Type-Safe**: TypeScript ensures correct message types

## Future Enhancements

- [ ] Add progress percentage for long operations
- [ ] Implement cancellation via progress UI
- [ ] Add progress history/logging
- [ ] Support nested progress (sub-tasks)
- [ ] Add progress notifications for background tasks
