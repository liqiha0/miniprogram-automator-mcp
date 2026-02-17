import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listSessions } from "../service.ts";
import { registerTool, textResult } from "./common.ts";

export function registerListSessionsTool(server: McpServer): void {
  registerTool(
    server,
    "list_sessions",
    {
      description: "List active miniprogram automation sessions.",
      inputSchema: {},
    },
    async () =>
      textResult({
        ok: true,
        sessions: listSessions(),
      }),
  );
}
