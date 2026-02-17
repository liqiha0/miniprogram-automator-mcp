import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { captureScreenshot, parseScreenshotInput } from "../service.ts";
import { errorResult, registerTool, textResult } from "./common.ts";

export function registerScreenshotTool(server: McpServer): void {
  registerTool(
    server,
    "screenshot",
    {
      description: "Capture screenshot for an existing session. Defaults to system temp directory.",
      inputSchema: {
        sessionId: z.string(),
        path: z.string().optional(),
      },
    },
    async (args) => {
      try {
        const input = parseScreenshotInput(args ?? {});
        return textResult(await captureScreenshot(input));
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
