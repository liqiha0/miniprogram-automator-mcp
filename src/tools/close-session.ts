import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { closeSession, parseCloseSessionInput } from "../service.ts";
import { errorResult, registerTool, textResult } from "./common.ts";

export function registerCloseSessionTool(server: McpServer): void {
  registerTool(
    server,
    "close_session",
    {
      description: "Close an active miniprogram automation session by sessionId.",
      inputSchema: {
        sessionId: z.string(),
      },
    },
    async (args) => {
      try {
        const input = parseCloseSessionInput(args ?? {});
        return textResult({
          ok: true,
          ...(await closeSession(input.sessionId)),
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
