import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { parseSnapshotInput, snapshotInteractiveTree } from "../service.ts";
import { errorResult, registerTool, textResult } from "./common.ts";

export function registerSnapshotTool(server: McpServer): void {
  registerTool(
    server,
    "snapshot",
    {
      description: "Get interactive tree snapshot with refs for current page.",
      inputSchema: {
        sessionId: z.string(),
        maxNodes: z.number().optional(),
      },
    },
    async (args) => {
      try {
        const input = parseSnapshotInput(args ?? {});
        return textResult(await snapshotInteractiveTree(input));
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
