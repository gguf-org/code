
import { tool } from 'ai';
import { readFileTool } from './read-file';
import { findFilesTool } from './find-files';
import { writeFileTool } from './write-file';
import { searchFileContentsTool } from './search-file-contents';
import { executeBashTool } from './execute-bash';
import { stringReplaceTool } from './string-replace';
import { getDiagnosticsTool } from './get-diagnostics';
import { fetchUrlTool } from './fetch-url';
import { webSearchTool } from './web-search';

import type { AISDKCoreTool } from '../../types/index';

export const nativeToolsRegistry: Record<string, AISDKCoreTool> = {
    read_file: tool(readFileTool),
    find_files: tool(findFilesTool),
    write_file: tool(writeFileTool),
    search_file_contents: tool(searchFileContentsTool),
    execute_bash: tool(executeBashTool),
    string_replace: tool(stringReplaceTool),
    lsp_get_diagnostics: tool(getDiagnosticsTool),
    fetch_url: tool(fetchUrlTool),
    web_search: tool(webSearchTool),
};
