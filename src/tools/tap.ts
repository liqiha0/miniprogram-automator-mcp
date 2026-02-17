import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { parseTapInput, tapElementByRef } from "../service.ts";
import { errorResult, registerTool, textResult } from "./common.ts";

export function registerTapTool(server: McpServer): void {
  registerTool(
    server,
    "tap",
    {
      description: "Tap an element by ref returned from snapshot.",
      inputSchema: {
        sessionId: z.string(),
        ref: z.string(),
        returnSnapshot: z.boolean().optional(),
        maxNodes: z.number().optional(),
        waitForStableMs: z.number().optional(),
      },
    },
    async (args) => {
      try {
        const input = parseTapInput(args ?? {});
        return textResult(await tapElementByRef(input));
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
