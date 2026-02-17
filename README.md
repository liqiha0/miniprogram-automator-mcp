# miniprogram-automator-mcp

一个基于 `miniprogram-automator` 的 MCP Server，用来让 Agent 自动化操作微信小程序。

## 核心功能

- 支持两种连接方式：`launch`（本地启动）与 `connect`（连接已有端点）
- 提供类似 agent-browser 的交互树模式（`snapshot` 返回 refs/tree/nth），便于稳定定位与操作
- 适合 Agent 场景下的稳定闭环操作（观察 -> 操作 -> 再观察）

## 前置要求

- Node.js `>=18`
- 微信开发者工具版本 `>= 1.02.1907232`
- 小程序基础库版本 `>= 2.7.3`
- 已在微信开发者工具中开启安全设置里的 CLI/HTTP 调用能力（未开启会导致 automator 无法启动）

## 在 MCP 客户端中接入

```json
{
  "mcpServers": {
    "weapp-automator": {
      "command": "npx",
      "args": ["-y", "miniprogram-automator-mcp"]
    }
  }
}
```

## 会话接入

会话接入支持 `launch` 和 `connect`：本地直接调试时用 `launch`，已有运行中的 websocket 自动化端点时用 `connect`。

## CLI 启动参数（可选）

你可以在启动 MCP Server 时通过参数指定默认会话配置。

查看帮助：

```bash
bunx miniprogram-automator-mcp --help
bunx miniprogram-automator-mcp launch --help
bunx miniprogram-automator-mcp connect --help
```

`launch` 模式示例：

```bash
bunx miniprogram-automator-mcp \
  launch \
  --project-path /absolute/path/to/miniprogram \
  --cli-path /Applications/wechatwebdevtools.app/Contents/MacOS/cli \
  --port 9420
```

`connect` 模式示例：

```bash
bunx miniprogram-automator-mcp \
  connect \
  --ws-endpoint ws://127.0.0.1:9420
```

常用参数：

- 子命令：`launch`（默认语义）或 `connect`
- `--project-path`: 小程序项目路径（launch 必填）
- `--cli-path`: 微信开发者工具 CLI 路径（launch 可选）
- `--port`: 自动化端口（launch 可选）
- `--account` / `--ticket` / `--trust-project` / `--cwd`: launch 可选高级参数
- `--ws-endpoint`: 连接地址（connect 必填）

## 环境变量

- `MINIPROGRAM_AUTOMATOR_MODE`: `launch` 或 `connect`
- `MINIPROGRAM_PROJECT_PATH`: 小程序项目路径（`launch` 模式）
- `MINIPROGRAM_CLI_PATH`: 微信开发者工具 CLI 路径（`launch` 模式）
- `MINIPROGRAM_AUTOMATOR_PORT`: 自动化端口（`launch` 模式）
- `MINIPROGRAM_AUTOMATOR_WS_ENDPOINT`: ws 地址（`connect` 模式）
