import type { SessionConfig } from "./types.ts";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseSessionConfig(value: unknown): SessionConfig {
  if (!isObject(value)) {
    throw new Error("sessionConfig must be an object");
  }

  const mode = value.mode;
  if (mode !== "launch" && mode !== "connect") {
    throw new Error("sessionConfig.mode must be 'launch' or 'connect'");
  }

  if (mode === "connect") {
    const wsEndpoint = value.wsEndpoint;
    if (typeof wsEndpoint !== "string" || wsEndpoint.length === 0) {
      throw new Error("sessionConfig.wsEndpoint is required in connect mode");
    }
    return { mode, wsEndpoint };
  }

  const projectPath = value.projectPath;
  if (typeof projectPath !== "string" || projectPath.length === 0) {
    throw new Error("sessionConfig.projectPath is required in launch mode");
  }

  const cliPath = value.cliPath;
  if (cliPath !== undefined && typeof cliPath !== "string") {
    throw new Error("sessionConfig.cliPath must be a string when provided");
  }

  const wsEndpoint = value.wsEndpoint;
  if (wsEndpoint !== undefined && typeof wsEndpoint !== "string") {
    throw new Error("sessionConfig.wsEndpoint must be a string when provided");
  }

  const port = value.port;
  if (port !== undefined && (typeof port !== "number" || !Number.isInteger(port) || port <= 0)) {
    throw new Error("sessionConfig.port must be a positive integer when provided");
  }

  const account = value.account;
  if (account !== undefined && typeof account !== "string") {
    throw new Error("sessionConfig.account must be a string when provided");
  }

  const ticket = value.ticket;
  if (ticket !== undefined && typeof ticket !== "string") {
    throw new Error("sessionConfig.ticket must be a string when provided");
  }

  const trustProject = value.trustProject;
  if (trustProject !== undefined && typeof trustProject !== "boolean") {
    throw new Error("sessionConfig.trustProject must be a boolean when provided");
  }

  const args = value.args;
  if (args !== undefined) {
    if (!Array.isArray(args) || args.some((item) => typeof item !== "string")) {
      throw new Error("sessionConfig.args must be an array of strings when provided");
    }
  }

  const cwd = value.cwd;
  if (cwd !== undefined && typeof cwd !== "string") {
    throw new Error("sessionConfig.cwd must be a string when provided");
  }

  return {
    mode,
    projectPath,
    cliPath,
    port,
    account,
    ticket,
    trustProject,
    args,
    cwd,
  };
}
