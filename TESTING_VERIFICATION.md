# Testing Guide: VS Code Extension Improvements

## Phase 1: Core Reliability (Execute Bash Tool)

### Test 1: Basic Command Execution
**Objective**: Verify that bash commands execute and return output properly.

**Steps**:
1. Open VS Code with the extension installed
2. Open the Coder sidebar
3. Send message: "List all files in the current directory"
4. Expected: Agent should use `execute_bash` tool with `ls` (or `dir` on Windows)
5. Verify: Output should be captured and displayed in the chat

**Success Criteria**:
- ✅ Command executes without opening a visible terminal
- ✅ Output is captured and returned to the agent
- ✅ Exit code is included in the response
- ✅ Agent can read and process the output

### Test 2: Command with Error
**Objective**: Verify error handling works correctly.

**Steps**:
1. Send message: "Show me the contents of a file that doesn't exist"
2. Agent should try: `cat nonexistent.txt`
3. Expected: Error message should be captured

**Success Criteria**:
- ✅ STDERR is captured
- ✅ Exit code shows failure (non-zero)
- ✅ Agent receives the error and can respond appropriately

### Test 3: Dangerous Command Blocking
**Objective**: Verify safety checks prevent destructive commands.

**Steps**:
1. Try to execute: `rm -rf /`
2. Expected: Command should be blocked before execution

**Success Criteria**:
- ✅ Command is blocked with safety message
- ✅ User is NOT prompted for permission
- ✅ Agent receives error message

### Test 4: Long-Running Command
**Objective**: Verify timeout handling.

**Steps**:
1. Execute a command that takes >60 seconds
2. Expected: Command should timeout

**Success Criteria**:
- ✅ Command times out after 60 seconds
- ✅ Timeout error is returned to agent
- ✅ Process is properly killed

## Phase 2: UI Polish (Codicons & Design)

### Test 5: Visual Inspection
**Objective**: Verify UI improvements are visible.

**Steps**:
1. Open Coder sidebar
2. Inspect header area

**Success Criteria**:
- ✅ Code icon (⚙️) appears next to "CODER" text
- ✅ Clear button shows trash icon instead of text
- ✅ Settings button shows gear icon
- ✅ Icons are properly styled and visible

### Test 6: Stop Button
**Objective**: Verify stop button uses Codicon.

**Steps**:
1. Send a message that triggers a long response
2. Observe the "Stop Generating" button

**Success Criteria**:
- ✅ Stop icon appears (debug-stop icon)
- ✅ Button is clickable and stops generation
- ✅ UI returns to normal state after stopping

## Phase 3: MCP Service Integration

### Test 7: MCP Service Initialization
**Objective**: Verify MCP service starts correctly.

**Steps**:
1. Create a `coder.config.json` with MCP server configuration:
```json
{
  "coder": {
    "mcp": {
      "servers": {
        "test-server": {
          "command": "node",
          "args": ["path/to/mcp-server.js"]
        }
      }
    }
  }
}
```
2. Reload VS Code
3. Open Output panel → "Coder" channel

**Success Criteria**:
- ✅ "MCP Service: Found 1 servers in config" appears
- ✅ "MCP Service: Connecting to 'test-server'..." appears
- ✅ If server exists: "Connected to 'test-server' with X tools"
- ✅ If server doesn't exist: Graceful error message

### Test 8: MCP Tool Discovery
**Objective**: Verify MCP tools are discovered.

**Steps**:
1. With a working MCP server configured
2. Check Output panel for tool list

**Success Criteria**:
- ✅ All tools from MCP server are listed
- ✅ Tool names and descriptions are shown
- ✅ No crashes or errors

## Integration Tests

### Test 9: End-to-End Agent Task
**Objective**: Verify the agent can complete a multi-step task.

**Steps**:
1. Send message: "Create a new file called test.txt with the content 'Hello World', then read it back to me"
2. Agent should:
   - Use `write_file` tool
   - Use `read_file` tool
   - Report success

**Success Criteria**:
- ✅ File is created successfully
- ✅ File content is read back
- ✅ Agent confirms completion
- ✅ No errors or hangs

### Test 10: Permission Flow
**Objective**: Verify permission prompts work correctly.

**Steps**:
1. Send message: "Delete all .log files"
2. Agent should request permission
3. Approve the request

**Success Criteria**:
- ✅ Permission prompt appears in webview
- ✅ Approve/Deny buttons work
- ✅ Command executes after approval
- ✅ Result is returned to agent

## Performance Tests

### Test 11: Large Output Handling
**Objective**: Verify output truncation works.

**Steps**:
1. Execute command that produces >10KB output
2. Example: `cat large-file.txt`

**Success Criteria**:
- ✅ Output is truncated at 10,000 characters
- ✅ Truncation message is appended
- ✅ No memory issues or crashes

### Test 12: Multiple Concurrent Requests
**Objective**: Verify abort controller works.

**Steps**:
1. Send a message
2. Immediately send another message
3. First request should be cancelled

**Success Criteria**:
- ✅ First request is aborted
- ✅ Second request proceeds normally
- ✅ No race conditions or errors

## Comparison with CLI Version

### Test 13: Feature Parity Check
**Objective**: Verify IDE version matches CLI capabilities.

**Comparison Table**:

| Feature | CLI Version | IDE Version | Status |
|---------|-------------|-------------|--------|
| Execute Bash | ✅ Process-based | ✅ Process-based | ✅ Match |
| Output Capture | ✅ Full capture | ✅ Full capture | ✅ Match |
| Error Handling | ✅ STDERR + Exit Code | ✅ STDERR + Exit Code | ✅ Match |
| Timeout | ✅ Configurable | ✅ 60s default | ✅ Match |
| Truncation | ✅ 10,000 chars | ✅ 10,000 chars | ✅ Match |
| MCP Support | ✅ Full | ✅ Full | ✅ Match |
| LSP Support | ✅ Full | ⚠️ Stub | ⚠️ Partial |
| UI Polish | N/A (CLI) | ✅ Codicons | ✅ Better |

## Known Limitations

1. **LSP Service**: Still a stub, needs full implementation
2. **Terminal Visibility**: Commands run in background (no visible terminal)
3. **Windows Compatibility**: Git Bash detection may vary by installation

## Next Steps

If all tests pass:
1. ✅ Phase 1 (Core Reliability) - COMPLETE
2. ✅ Phase 2 (UI Polish) - COMPLETE
3. ✅ Phase 3 (MCP Service) - COMPLETE
4. ⏳ Phase 4 (LSP Service) - Future work

The IDE version is now **at or above** CLI version standards for core functionality!
