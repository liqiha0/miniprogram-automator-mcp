import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionConfig } from "../types.ts";
import { createSession, parseCreateSessionInput } from "../service.ts";
import { errorResult, registerTool, sessionConfigInputSchema, textResult } from "./common.ts";

export function registerCreateSessionTool(server: McpServer, defaultSessionConfig?: SessionConfig): void {
  registerTool(
    server,
    "create_session",
    {
      description:
        "Create a miniprogram automation session. Uses sessionConfig first, then startup defaults.",
      inputSchema: {
        sessionConfig: sessionConfigInputSchema,
      },
    },
    async (args) => {
      try {
        const input = parseCreateSessionInput(args ?? {});
        const config = input.sessionConfig ?? defaultSessionConfig;
        if (!config) {
          throw new Error("sessionConfig is required when no startup default is configured");
        }

        const session = await createSession(config);
        return textResult({
          ok: true,
          session: {
            sessionId: session.id,
            mode: session.mode,
            createdAt: session.createdAt,
            source: session.source,
          },
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
