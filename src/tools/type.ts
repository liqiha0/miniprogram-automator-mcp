import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { parseTypeInput, typeTextByRef } from "../service.ts";
import { errorResult, registerTool, textResult } from "./common.ts";

export function registerTypeTool(server: McpServer): void {
  registerTool(
    server,
    "type",
    {
      description: "Type text into an input element by ref returned from snapshot.",
      inputSchema: {
        sessionId: z.string(),
        ref: z.string(),
        text: z.string(),
        returnSnapshot: z.boolean().optional(),
        maxNodes: z.number().optional(),
        waitForStableMs: z.number().optional(),
      },
    },
    async (args) => {
      try {
        const input = parseTypeInput(args ?? {});
        return textResult(await typeTextByRef(input));
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
