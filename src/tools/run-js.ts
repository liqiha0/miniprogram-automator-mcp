import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { parseRunInput, runJs } from "../service.ts";
import { errorResult, registerTool, textResult } from "./common.ts";

export function registerRunJsTool(server: McpServer): void {
  registerTool(
    server,
    "run_js",
    {
      description: "Run JavaScript against WeChat miniprogram-automator.",
      inputSchema: {
        sessionId: z.string(),
        code: z.string(),
        timeoutMs: z.number().optional(),
      },
    },
    async (args) => {
      try {
        const input = parseRunInput(args ?? {});
        const result = await runJs(input);
        return {
          ...textResult(result),
          isError: !result.ok,
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
