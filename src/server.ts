import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { closeAllSessions } from "./service.ts";
import { registerTools } from "./tools/index.ts";
import type { SessionConfig } from "./types.ts";

export interface StartServerOptions {
  defaultSessionConfig?: SessionConfig;
}

export async function startServer(options: StartServerOptions = {}): Promise<void> {
  const server = new McpServer({
    name: "miniprogram-automator-mcp",
    version: "0.1.0",
  });

  registerTools(server, options.defaultSessionConfig);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async (): Promise<void> => {
    await closeAllSessions();
    await server.close();
  };

  process.on("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });
}
