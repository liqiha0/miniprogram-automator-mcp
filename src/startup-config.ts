import { Command } from "commander";
import { parseSessionConfig } from "./session-config.ts";
import type { SessionConfig } from "./types.ts";

function parsePositiveInt(value: string, optionName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${optionName} must be a positive integer`);
  }
  return parsed;
}

export function resolveSessionConfigFromCliArgs(argv = process.argv.slice(2)): SessionConfig | undefined {
  let resolved: SessionConfig | undefined;

  const program = new Command();
  program
    .name("miniprogram-automator-mcp")
    .description("微信小程序自动化 MCP Server")
    .showHelpAfterError();

  program
    .command("launch")
    .description("启动开发者工具，并设置默认 launch 会话配置")
    .requiredOption("--project-path <path>", "小程序项目路径")
    .option("--cli-path <path>", "微信开发者工具 CLI 路径")
    .option("--port <number>", "自动化端口", (value) => parsePositiveInt(value, "--port"))
    .option("--account <name>", "启动时使用的账号")
    .option("--ticket <value>", "启动 ticket")
    .option("--trust-project", "启动时信任项目")
    .option("--cwd <path>", "launch 模式工作目录")
    .action((options) => {
      resolved = parseSessionConfig({
        mode: "launch",
        projectPath: options.projectPath,
        cliPath: options.cliPath,
        port: options.port,
        account: options.account,
        ticket: options.ticket,
        trustProject: options.trustProject,
        cwd: options.cwd,
      });
    });

  program
    .command("connect")
    .description("连接到已存在的 automator websocket 端点")
    .requiredOption("--ws-endpoint <url>", "automator websocket 地址")
    .action((options) => {
      resolved = parseSessionConfig({
        mode: "connect",
        wsEndpoint: options.wsEndpoint,
      });
    });

  if (argv.length === 0) {
    return undefined;
  }

  program.parse(["node", "miniprogram-automator-mcp", ...argv], { from: "node" });
  return resolved;
}

export function resolveSessionConfigFromEnv(env = process.env): SessionConfig | undefined {
  const modeFromEnv = env.MINIPROGRAM_AUTOMATOR_MODE;
  if (modeFromEnv === "connect") {
    const wsEndpoint = env.MINIPROGRAM_AUTOMATOR_WS_ENDPOINT;
    if (wsEndpoint) {
      return { mode: "connect", wsEndpoint };
    }
    return undefined;
  }

  if (modeFromEnv === "launch") {
    const projectPath = env.MINIPROGRAM_PROJECT_PATH;
    if (!projectPath) {
      return undefined;
    }
    const cliPath = env.MINIPROGRAM_CLI_PATH;
    const portRaw = env.MINIPROGRAM_AUTOMATOR_PORT;
    const port = portRaw ? Number.parseInt(portRaw, 10) : undefined;
    return {
      mode: "launch",
      projectPath,
      cliPath,
      port: Number.isInteger(port) ? port : undefined,
    };
  }

  const fallbackProjectPath = env.MINIPROGRAM_PROJECT_PATH;
  if (fallbackProjectPath) {
    return {
      mode: "launch",
      projectPath: fallbackProjectPath,
      cliPath: env.MINIPROGRAM_CLI_PATH,
      port: env.MINIPROGRAM_AUTOMATOR_PORT ? Number.parseInt(env.MINIPROGRAM_AUTOMATOR_PORT, 10) : undefined,
    };
  }

  const fallbackWsEndpoint = env.MINIPROGRAM_AUTOMATOR_WS_ENDPOINT;
  if (fallbackWsEndpoint) {
    return {
      mode: "connect",
      wsEndpoint: fallbackWsEndpoint,
    };
  }

  return undefined;
}

export function resolveDefaultSessionConfig(argv = process.argv.slice(2), env = process.env): SessionConfig | undefined {
  return resolveSessionConfigFromCliArgs(argv) ?? resolveSessionConfigFromEnv(env);
}
