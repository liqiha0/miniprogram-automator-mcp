export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export interface LaunchSessionConfig {
  mode: "launch";
  projectPath: string;
  cliPath?: string;
  port?: number;
  account?: string;
  ticket?: string;
  trustProject?: boolean;
  args?: string[];
  cwd?: string;
}

export interface ConnectSessionConfig {
  mode: "connect";
  wsEndpoint: string;
}

export type SessionConfig = LaunchSessionConfig | ConnectSessionConfig;

export interface RunInput {
  sessionId: string;
  code: string;
  timeoutMs?: number;
}

export interface ScreenshotInput {
  sessionId: string;
  path?: string;
}

export interface SnapshotInput {
  sessionId: string;
  maxNodes?: number;
}

export interface TapInput {
  sessionId: string;
  ref: string;
  returnSnapshot?: boolean;
  maxNodes?: number;
  waitForStableMs?: number;
}

export interface TypeInput {
  sessionId: string;
  ref: string;
  text: string;
  returnSnapshot?: boolean;
  maxNodes?: number;
  waitForStableMs?: number;
}

export interface SessionRecord {
  id: string;
  miniProgram: MiniProgramLike;
  createdAt: string;
  mode: SessionConfig["mode"];
  source: string;
  busy: boolean;
  busyOperation?: string;
}

export interface MiniProgramLike {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  off?: (event: string, listener: (...args: unknown[]) => void) => void;
  close?: () => Promise<void> | void;
  disconnect?: () => Promise<void> | void;
  currentPage?: () => Promise<unknown>;
  screenshot?: (options?: { path?: string }) => Promise<unknown>;
  [key: string]: unknown;
}

export interface PageLike {
  path?: string | (() => Promise<string>);
  $$?: (selector: string) => Promise<unknown[]>;
}

export interface ElementLike {
  tagName?: string;
  text?: () => Promise<string>;
  attribute?: (name: string) => Promise<string>;
  size?: () => Promise<{ width?: string; height?: string }>;
  offset?: () => Promise<unknown>;
  tap?: () => Promise<void>;
}

export interface SnapshotNode {
  ref: string;
  selector: string;
  index: number;
  nth?: number;
  tag?: string;
  text?: string;
  className?: string;
  size?: {
    width?: string;
    height?: string;
  };
  offset?: JsonValue;
}

export interface StructuredRunResult {
  ok: boolean;
  sessionId: string;
  durationMs: number;
  result?: JsonValue;
  logs: string[];
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
