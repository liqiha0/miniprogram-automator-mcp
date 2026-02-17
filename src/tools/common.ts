import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { formatUnknownOutput, toErrorInfo } from "../service.ts";

export const sessionConfigInputSchema = z
  .object({
    mode: z.enum(["launch", "connect"]),
    projectPath: z.string().optional(),
    cliPath: z.string().optional(),
    port: z.number().optional(),
    account: z.string().optional(),
    ticket: z.string().optional(),
    trustProject: z.boolean().optional(),
    args: z.array(z.string()).optional(),
    cwd: z.string().optional(),
    wsEndpoint: z.string().optional(),
  })
  .optional();

export function textResult(payload: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: formatUnknownOutput(payload) }],
  };
}

export function errorResult(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  return {
    content: [
      {
        type: "text",
        text: formatUnknownOutput({
          ok: false,
          error: toErrorInfo(error),
        }),
      },
    ],
    isError: true,
  };
}

type ToolTextContent = { type: "text"; text: string };
type ToolResult = { content: ToolTextContent[]; isError?: boolean };
type ToolHandler = (args: Record<string, unknown> | undefined) => Promise<ToolResult> | ToolResult;

type RegisterToolCompat = (
  name: string,
  config: {
    description?: string;
    inputSchema?: unknown;
  },
  cb: ToolHandler,
) => unknown;

export function registerTool(
  server: McpServer,
  name: string,
  config: {
    description?: string;
    inputSchema?: unknown;
  },
  cb: ToolHandler,
): void {
  const register = server.registerTool as unknown as RegisterToolCompat;
  register.call(server, name, config, cb);
}
