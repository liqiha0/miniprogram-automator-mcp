import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionConfig } from "../types.ts";
import { registerCloseSessionTool } from "./close-session.ts";
import { registerCreateSessionTool } from "./create-session.ts";
import { registerListSessionsTool } from "./list-sessions.ts";
import { registerRunJsTool } from "./run-js.ts";
import { registerScreenshotTool } from "./screenshot.ts";
import { registerSnapshotTool } from "./snapshot.ts";
import { registerTapTool } from "./tap.ts";
import { registerTypeTool } from "./type.ts";
import { registerUsageGuideTool } from "./usage-guide.ts";

export function registerTools(server: McpServer, defaultSessionConfig?: SessionConfig): void {
  registerCreateSessionTool(server, defaultSessionConfig);
  registerUsageGuideTool(server);
  registerRunJsTool(server);
  registerListSessionsTool(server);
  registerSnapshotTool(server);
  registerTapTool(server);
  registerTypeTool(server);
  registerScreenshotTool(server);
  registerCloseSessionTool(server);
}
