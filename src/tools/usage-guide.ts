import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildGuidePayload } from "../service.ts";
import { registerTool } from "./common.ts";

export function registerUsageGuideTool(server: McpServer): void {
  registerTool(
    server,
    "usage_guide",
    {
      description: "返回本 MCP Server 的中文 Markdown 使用指南。",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text", text: buildGuidePayload() }],
    }),
  );
}
