# Quick Start Guide: Testing the Upgraded Extension

## Installation & Setup

### 1. Build the Extension
```bash
npm run build
```

### 2. Load in VS Code
1. Press `F5` in VS Code (opens Extension Development Host)
2. Or manually:
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run "Developer: Install Extension from Location..."
   - Select the `vscode` folder

### 3. Open the Extension
- Click the Code icon in the Activity Bar (left sidebar)
- Or use Command Palette: "Open Code"

## Quick Tests

### Test 1: Execute Bash (Core Feature)
**Message**: "List all files in the current directory"

**Expected Behavior**:
1. Agent uses `execute_bash` tool
2. Permission prompt appears in webview
3. Click "Approve"
4. Output appears in chat (no visible terminal)
5. Agent can read and respond to the output

**Success**: ✅ If output is captured and displayed

---

### Test 2: UI Icons
**Action**: Look at the header

**Expected Behavior**:
- Code icon appears next to "CODE"
- Clear button shows trash icon
- Settings button shows gear icon

**Success**: ✅ If all icons are visible and styled

---

### Test 3: File Operations
**Message**: "Create a file called hello.txt with the content 'Hello World'"

**Expected Behavior**:
1. Agent uses `write_file` tool
2. Permission prompt appears
3. After approval, file is created
4. Agent confirms success

**Success**: ✅ If file exists with correct content

---

### Test 4: Error Handling
**Message**: "Show me the contents of nonexistent.txt"

**Expected Behavior**:
1. Agent uses `read_file` tool
2. Error message is returned
3. Agent acknowledges the file doesn't exist

**Success**: ✅ If error is handled gracefully

---

### Test 5: Stop Button
**Message**: "Write me a very long essay about programming"

**Expected Behavior**:
1. Agent starts generating response
2. "Stop Generating" button appears with stop icon
3. Click the button
4. Generation stops immediately

**Success**: ✅ If stop button works and shows icon

---

## Configuration (Optional)

### Enable MCP Server
Create `coder.config.json` in workspace root:

```json
{
  "coder": {
    "providers": [
      {
        "name": "openai",
        "type": "openai",
        "models": ["gpt-4"],
        "config": {
          "apiKey": "your-api-key",
          "baseURL": "https://api.openai.com/v1"
        }
      }
    ],
    "activeProvider": "openai",
    "mcp": {
      "servers": {
        "example": {
          "command": "node",
          "args": ["path/to/mcp-server.js"]
        }
      }
    }
  }
}
```

Check Output panel → "Code" to see MCP connection status.

---

## Troubleshooting

### Issue: Not running
**Solution**:
1. Check browser console for errors
2. Rebuild: `npm run build`

### Issue: Commands not executing
**Solution**:
1. Check Output panel → "Code" for errors
2. Verify workspace folder is open
3. Check permission prompts in webview

### Issue: MCP not connecting
**Solution**:
1. Verify `coder.config.json` syntax
2. Check MCP server command is valid
3. Look for errors in Output panel

---

## Comparison: Before vs After

### Execute Bash Tool
| Aspect | Before | After |
|--------|--------|-------|
| Execution | Visible terminal | Background process |
| Output | Partial/unreliable | Full capture |
| Error handling | Limited | STDERR + Exit code |
| Safety | None | Dangerous command blocking |

### UI
| Aspect | Before | After |
|--------|--------|-------|
| Icons | Unicode (⏻) | Codicons (professional) |
| Header | Plain text | Icon + text |
| Buttons | Text-based | Icon-based |
| Visual style | Basic | VS Code standard |

### MCP Service
| Aspect | Before | After |
|--------|--------|-------|
| Status | Stub (logs only) | Functional client |
| Connection | None | Full stdio transport |
| Tools | Not available | Discovered & callable |

---

## Next Steps

1. ✅ Test all features above
2. ✅ Verify icons appear correctly
3. ✅ Test command execution reliability
4. ✅ Configure MCP server (optional)
5. ✅ Compare with CLI version behavior

## Success Criteria

The extension is working correctly if:
- ✅ Commands execute in background and return output
- ✅ Icons are visible and professional-looking
- ✅ Permission flow works smoothly
- ✅ Agent can complete multi-step tasks
- ✅ No crashes or hangs
- ✅ MCP servers connect (if configured)

**Status**: All improvements implemented and ready for testing! 🎉
