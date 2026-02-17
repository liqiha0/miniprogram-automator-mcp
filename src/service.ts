import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import automator from "miniprogram-automator";
import { parseSessionConfig } from "./session-config.ts";
import type {
  ElementLike,
  JsonObject,
  JsonValue,
  MiniProgramLike,
  PageLike,
  RunInput,
  ScreenshotInput,
  SessionConfig,
  SessionRecord,
  SnapshotInput,
  SnapshotNode,
  TapInput,
  TypeInput,
  StructuredRunResult,
} from "./types.ts";

const DEFAULT_TIMEOUT_MS = 30_000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 300_000;
const DEFAULT_STABLE_WAIT_MS = 300;
const DEFAULT_SCREENSHOT_DIR = join(tmpdir(), "miniprogram-automator-mcp", "screenshots");
const DEFAULT_SNAPSHOT_MAX_NODES = 80;
const MAX_SNAPSHOT_MAX_NODES = 500;
const INTERACTIVE_SELECTORS = [
  "button",
  "navigator",
  "input",
  "textarea",
  "switch",
  "slider",
  "checkbox",
  "radio",
  "picker",
  "picker-view",
  "movable-view",
  "cover-view",
  "view[bindtap]",
  "view[catchtap]",
  "text[bindtap]",
  "text[catchtap]",
  "image[bindtap]",
  "image[catchtap]",
  "view",
  "text",
  "image",
  "uni-button",
  "uni-input",
  "u-button",
  "u-input",
  ".u-modal__btn",
  ".u-modal__button",
  ".uni-easyinput__content-input",
];

const sessions = new Map<string, SessionRecord>();
const snapshotRefsBySession = new Map<string, Map<string, { selector: string; index: number }>>();

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeToString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function toErrorInfo(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    name: "UnknownError",
    message: safeToString(error),
  };
}

export function normalizeResult(result: unknown): JsonValue {
  if (result === null) {
    return null;
  }
  if (typeof result === "string" || typeof result === "number" || typeof result === "boolean") {
    return result;
  }
  if (Array.isArray(result)) {
    return result.map((item) => normalizeResult(item));
  }
  if (isObject(result)) {
    const objectResult: JsonObject = {};
    for (const [key, value] of Object.entries(result)) {
      objectResult[key] = normalizeResult(value);
    }
    return objectResult;
  }
  return safeToString(result);
}

export function formatUnknownOutput(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

export function parseRunInput(raw: unknown): RunInput {
  if (!isObject(raw)) {
    throw new Error("arguments must be an object");
  }

  const code = raw.code;
  if (typeof code !== "string" || code.trim().length === 0) {
    throw new Error("code is required and must be a non-empty string");
  }

  const sessionId = raw.sessionId;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("sessionId is required and must be a non-empty string");
  }

  const timeoutMs = raw.timeoutMs;
  if (timeoutMs !== undefined && (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs))) {
    throw new Error("timeoutMs must be a finite number when provided");
  }

  return {
    sessionId,
    code,
    timeoutMs,
  };
}

export function parseCreateSessionInput(raw: unknown): { sessionConfig?: SessionConfig } {
  if (!isObject(raw)) {
    throw new Error("arguments must be an object");
  }

  const sessionConfigRaw = raw.sessionConfig;
  if (sessionConfigRaw === undefined) {
    return { sessionConfig: undefined };
  }

  return { sessionConfig: parseSessionConfig(sessionConfigRaw) };
}

export function parseCloseSessionInput(raw: unknown): { sessionId: string } {
  if (!isObject(raw)) {
    throw new Error("arguments must be an object");
  }
  const sessionId = raw.sessionId;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("sessionId is required");
  }
  return { sessionId };
}

export function parseScreenshotInput(raw: unknown): ScreenshotInput {
  if (!isObject(raw)) {
    throw new Error("arguments must be an object");
  }

  const sessionId = raw.sessionId;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("sessionId is required");
  }

  const path = raw.path;
  if (path !== undefined && typeof path !== "string") {
    throw new Error("path must be a string when provided");
  }

  return { sessionId, path };
}

export function parseSnapshotInput(raw: unknown): SnapshotInput {
  if (!isObject(raw)) {
    throw new Error("arguments must be an object");
  }

  const sessionId = raw.sessionId;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("sessionId is required");
  }

  const maxNodes = raw.maxNodes;
  if (maxNodes !== undefined && (typeof maxNodes !== "number" || !Number.isFinite(maxNodes))) {
    throw new Error("maxNodes must be a finite number when provided");
  }

  return {
    sessionId,
    maxNodes,
  };
}

export function parseTapInput(raw: unknown): TapInput {
  if (!isObject(raw)) {
    throw new Error("arguments must be an object");
  }

  const sessionId = raw.sessionId;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("sessionId is required");
  }

  const ref = raw.ref;
  if (typeof ref !== "string" || ref.length === 0) {
    throw new Error("ref is required");
  }

  const returnSnapshot = raw.returnSnapshot;
  if (returnSnapshot !== undefined && typeof returnSnapshot !== "boolean") {
    throw new Error("returnSnapshot must be a boolean when provided");
  }

  const maxNodes = raw.maxNodes;
  if (maxNodes !== undefined && (typeof maxNodes !== "number" || !Number.isFinite(maxNodes))) {
    throw new Error("maxNodes must be a finite number when provided");
  }

  const waitForStableMs = raw.waitForStableMs;
  if (
    waitForStableMs !== undefined &&
    (typeof waitForStableMs !== "number" || !Number.isFinite(waitForStableMs) || waitForStableMs < 0)
  ) {
    throw new Error("waitForStableMs must be a non-negative finite number when provided");
  }

  return {
    sessionId,
    ref,
    returnSnapshot,
    maxNodes,
    waitForStableMs,
  };
}

export function parseTypeInput(raw: unknown): TypeInput {
  if (!isObject(raw)) {
    throw new Error("arguments must be an object");
  }

  const sessionId = raw.sessionId;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("sessionId is required");
  }

  const ref = raw.ref;
  if (typeof ref !== "string" || ref.length === 0) {
    throw new Error("ref is required");
  }

  const text = raw.text;
  if (typeof text !== "string") {
    throw new Error("text must be a string");
  }

  const returnSnapshot = raw.returnSnapshot;
  if (returnSnapshot !== undefined && typeof returnSnapshot !== "boolean") {
    throw new Error("returnSnapshot must be a boolean when provided");
  }

  const maxNodes = raw.maxNodes;
  if (maxNodes !== undefined && (typeof maxNodes !== "number" || !Number.isFinite(maxNodes))) {
    throw new Error("maxNodes must be a finite number when provided");
  }

  const waitForStableMs = raw.waitForStableMs;
  if (
    waitForStableMs !== undefined &&
    (typeof waitForStableMs !== "number" || !Number.isFinite(waitForStableMs) || waitForStableMs < 0)
  ) {
    throw new Error("waitForStableMs must be a non-negative finite number when provided");
  }

  return {
    sessionId,
    ref,
    text,
    returnSnapshot,
    maxNodes,
    waitForStableMs,
  };
}

export async function createSession(config: SessionConfig): Promise<SessionRecord> {
  let miniProgram: MiniProgramLike;

  if (config.mode === "connect") {
    miniProgram = (await automator.connect({
      wsEndpoint: config.wsEndpoint,
    })) as unknown as MiniProgramLike;
  } else {
    miniProgram = (await automator.launch({
      projectPath: config.projectPath,
      cliPath: config.cliPath,
      port: config.port,
      account: config.account,
      ticket: config.ticket,
      trustProject: config.trustProject,
      args: config.args,
      cwd: config.cwd,
    })) as unknown as MiniProgramLike;
  }

  const record: SessionRecord = {
    id: randomUUID(),
    miniProgram,
    createdAt: new Date().toISOString(),
    mode: config.mode,
    source: "tool",
    busy: false,
    busyOperation: undefined,
  };

  sessions.set(record.id, record);
  return record;
}

export async function closeSession(sessionId: string): Promise<{ closed: true; sessionId: string }> {
  const record = sessions.get(sessionId);
  if (!record) {
    throw new Error(`session not found: ${sessionId}`);
  }

  if (record.busy) {
    throw new Error(
      `session is busy with ${record.busyOperation ?? "another operation"}. wait for it to finish before close_session`,
    );
  }

  if (record.miniProgram.close) {
    await record.miniProgram.close();
  } else if (record.miniProgram.disconnect) {
    await record.miniProgram.disconnect();
  }

  snapshotRefsBySession.delete(sessionId);
  sessions.delete(sessionId);
  return { closed: true, sessionId };
}

export async function closeAllSessions(): Promise<void> {
  const sessionIds = Array.from(sessions.keys());
  for (const sessionId of sessionIds) {
    try {
      await closeSession(sessionId);
    } catch {
    }
  }
}

export function listSessions(): JsonValue {
  return Array.from(sessions.values()).map((record) => ({
    sessionId: record.id,
    mode: record.mode,
    createdAt: record.createdAt,
    source: record.source,
  }));
}

export function getSessionById(sessionId: string): SessionRecord {
  const existing = sessions.get(sessionId);
  if (!existing) {
    throw new Error(`session not found: ${sessionId}`);
  }
  return existing;
}

async function withSessionTask<T>(
  sessionId: string,
  operation: string,
  fn: (session: SessionRecord) => Promise<T>,
): Promise<T> {
  const session = getSessionById(sessionId);
  if (session.busy) {
    throw new Error(
      `session is busy with ${session.busyOperation ?? "another operation"}; retry later or use a different session`,
    );
  }

  session.busy = true;
  session.busyOperation = operation;
  try {
    return await fn(session);
  } finally {
    session.busy = false;
    session.busyOperation = undefined;
  }
}

export function sanitizeTimeout(timeoutMs: number | undefined): number {
  if (timeoutMs === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }
  if (!Number.isFinite(timeoutMs)) {
    return DEFAULT_TIMEOUT_MS;
  }
  const rounded = Math.floor(timeoutMs);
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, rounded));
}

async function runWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`script execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function createCapturedConsole(logs: string[]): Console {
  const append = (level: string, args: unknown[]): void => {
    const rendered = args.map((item) => safeToString(item)).join(" ");
    logs.push(`[script:${level}] ${rendered}`);
  };

  return {
    ...console,
    log: (...args: unknown[]) => append("log", args),
    info: (...args: unknown[]) => append("info", args),
    warn: (...args: unknown[]) => append("warn", args),
    error: (...args: unknown[]) => append("error", args),
    debug: (...args: unknown[]) => append("debug", args),
  };
}

export async function executeScript(
  record: SessionRecord,
  code: string,
  timeoutMs: number,
): Promise<StructuredRunResult> {
  const logs: string[] = [];
  const scriptConsole = createCapturedConsole(logs);

  const consoleListener = (...args: unknown[]): void => {
    logs.push(`[miniProgram:console] ${args.map((item) => safeToString(item)).join(" ")}`);
  };
  const exceptionListener = (...args: unknown[]): void => {
    logs.push(`[miniProgram:exception] ${args.map((item) => safeToString(item)).join(" ")}`);
  };

  record.miniProgram.on?.("console", consoleListener);
  record.miniProgram.on?.("exception", exceptionListener);

  const AsyncFunction = Object.getPrototypeOf(async () => undefined).constructor as new (
    ...args: string[]
  ) => (...callArgs: unknown[]) => Promise<unknown>;

  const sleep = (ms: number): Promise<void> => {
    if (!Number.isFinite(ms) || ms < 0) {
      throw new Error("sleep(ms) requires ms >= 0");
    }
    return new Promise<void>((resolve) => {
      setTimeout(resolve, Math.floor(ms));
    });
  };

  const assert = (condition: unknown, message?: string): void => {
    if (!condition) {
      throw new Error(message ?? "assertion failed");
    }
  };

  const startedAt = Date.now();
  try {
    const fn = new AsyncFunction(
      "miniProgram",
      "sleep",
      "assert",
      "session",
      "console",
      "return (async () => {\n" + code + "\n})();",
    );

    const executionResult = await runWithTimeout(
      () => fn(record.miniProgram, sleep, assert, { sessionId: record.id }, scriptConsole),
      timeoutMs,
    );

    return {
      ok: true,
      sessionId: record.id,
      durationMs: Date.now() - startedAt,
      result: normalizeResult(executionResult),
      logs,
    };
  } catch (error) {
    return {
      ok: false,
      sessionId: record.id,
      durationMs: Date.now() - startedAt,
      logs,
      error: toErrorInfo(error),
    };
  } finally {
    record.miniProgram.off?.("console", consoleListener);
    record.miniProgram.off?.("exception", exceptionListener);
  }
}

function buildDefaultScreenshotPath(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const random = Math.random().toString(36).slice(2, 8);
  return join(DEFAULT_SCREENSHOT_DIR, `screenshot-${timestamp}-${random}.png`);
}

export async function captureScreenshot(input: ScreenshotInput): Promise<{
  ok: boolean;
  sessionId: string;
  path: string;
  returned?: JsonValue;
}> {
  return withSessionTask(input.sessionId, "screenshot", async (session) => {
    const screenshotPath = input.path ?? buildDefaultScreenshotPath();
    await mkdir(dirname(screenshotPath), { recursive: true });

    const screenshotFn = session.miniProgram.screenshot;
    if (typeof screenshotFn !== "function") {
      throw new Error("miniProgram.screenshot is not available on this session");
    }

    const maybeResult = await screenshotFn.call(session.miniProgram, { path: screenshotPath });
    return {
      ok: true,
      sessionId: session.id,
      path: screenshotPath,
      returned: maybeResult === undefined ? undefined : normalizeResult(maybeResult),
    };
  });
}

function sanitizeMaxNodes(maxNodes: number | undefined): number {
  if (maxNodes === undefined) {
    return DEFAULT_SNAPSHOT_MAX_NODES;
  }
  const rounded = Math.floor(maxNodes);
  if (!Number.isFinite(rounded)) {
    return DEFAULT_SNAPSHOT_MAX_NODES;
  }
  return Math.max(1, Math.min(MAX_SNAPSHOT_MAX_NODES, rounded));
}

function sanitizeNonNegativeMs(value: number | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
}

async function sleepMs(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function resolveCurrentPageRoute(page: PageLike): Promise<string | undefined> {
  if (typeof page.path === "string") {
    return page.path;
  }
  if (typeof page.path === "function") {
    try {
      const route = await page.path();
      return typeof route === "string" ? route : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

async function getCurrentPage(session: SessionRecord): Promise<PageLike> {
  const currentPageFn = session.miniProgram.currentPage;
  if (typeof currentPageFn !== "function") {
    throw new Error("miniProgram.currentPage is not available on this session");
  }

  const pageUnknown = await currentPageFn.call(session.miniProgram);
  if (!pageUnknown || typeof pageUnknown !== "object") {
    throw new Error("No current page found.");
  }

  const page = pageUnknown as PageLike;
  if (typeof page.$$ !== "function") {
    throw new Error("Current page does not support element query ($$)");
  }
  return page;
}

async function resolveElementByRef(
  session: SessionRecord,
  ref: string,
): Promise<{ page: PageLike; element: ElementLike; selector: string; index: number }> {
  const refMap = snapshotRefsBySession.get(session.id);
  if (!refMap) {
    throw new Error("No snapshot cache for this session. Call snapshot first.");
  }

  const locator = refMap.get(ref);
  if (!locator) {
    throw new Error(`ref not found: ${ref}. Call snapshot to refresh refs.`);
  }

  const page = await getCurrentPage(session);
  const queryAll = page.$$;
  if (typeof queryAll !== "function") {
    throw new Error("Current page does not support element query ($$)");
  }
  const candidates = await queryAll.call(page, locator.selector);
  const target = candidates[locator.index];
  if (!target || typeof target !== "object") {
    throw new Error(`Element not found for ref ${ref}. Call snapshot to refresh.`);
  }

  return {
    page,
    element: target as ElementLike,
    selector: locator.selector,
    index: locator.index,
  };
}

async function collectElementNode(
  element: ElementLike,
  selector: string,
  index: number,
  ref: string,
): Promise<SnapshotNode> {
  const text = typeof element.text === "function" ? await element.text().catch(() => undefined) : undefined;
  const className =
    typeof element.attribute === "function"
      ? await element.attribute("class").catch(() => undefined)
      : undefined;
  const size = typeof element.size === "function" ? await element.size().catch(() => undefined) : undefined;
  const offset = typeof element.offset === "function" ? await element.offset().catch(() => undefined) : undefined;

  return {
    ref,
    selector,
    index,
    tag: element.tagName,
    text,
    className,
    size,
    offset: offset === undefined ? undefined : normalizeResult(offset),
  };
}

function buildSnapshotText(nodes: SnapshotNode[]): string {
  if (nodes.length === 0) {
    return "(no interactive elements)";
  }
  const grouped = new Map<string, SnapshotNode[]>();
  for (const node of nodes) {
    const bucket = grouped.get(node.selector);
    if (bucket) {
      bucket.push(node);
    } else {
      grouped.set(node.selector, [node]);
    }
  }

  const lines: string[] = [];
  for (const [selector, selectorNodes] of grouped.entries()) {
    lines.push(`- selector \"${selector}\"`);
    for (const node of selectorNodes) {
      const parts = [
        `  - ${node.tag ?? "element"}`,
        node.text && node.text.length > 0 ? `\"${node.text}\"` : undefined,
        `[ref=${node.ref}]`,
        node.nth !== undefined && node.nth > 0 ? `[nth=${node.nth}]` : undefined,
      ].filter((item): item is string => typeof item === "string");
      lines.push(parts.join(" "));
    }
  }
  return lines.join("\n");
}

function annotateSnapshotNodes(nodes: SnapshotNode[]): SnapshotNode[] {
  const keyCounter = new Map<string, number>();
  return nodes.map((node) => {
    const key = `${node.tag ?? "element"}|${(node.text ?? "").trim()}|${node.selector}`;
    const seen = keyCounter.get(key) ?? 0;
    keyCounter.set(key, seen + 1);
    return {
      ...node,
      nth: seen > 0 ? seen : undefined,
    };
  });
}

function buildSnapshotTree(nodes: SnapshotNode[]): JsonValue {
  const grouped = new Map<string, SnapshotNode[]>();
  for (const node of nodes) {
    const bucket = grouped.get(node.selector);
    if (bucket) {
      bucket.push(node);
    } else {
      grouped.set(node.selector, [node]);
    }
  }

  return Array.from(grouped.entries()).map(([selector, selectorNodes]) => ({
    selector,
    count: selectorNodes.length,
    items: selectorNodes.map((node) => ({
      ref: node.ref,
      tag: node.tag ?? null,
      text: node.text ?? null,
      nth: node.nth ?? null,
      index: node.index,
    })),
  }));
}

async function snapshotInteractiveTreeUnlocked(
  session: SessionRecord,
  maxNodesInput: number | undefined,
): Promise<JsonValue> {
  const page = await getCurrentPage(session);
  const queryAll = page.$$;
  if (typeof queryAll !== "function") {
    throw new Error("Current page does not support element query ($$)");
  }

  const maxNodes = sanitizeMaxNodes(maxNodesInput);
  const route = await resolveCurrentPageRoute(page);
  const nodes: SnapshotNode[] = [];
  const dedupeKeys = new Set<string>();

  for (const selector of INTERACTIVE_SELECTORS) {
    if (nodes.length >= maxNodes) {
      break;
    }

      let elements: unknown[];
      try {
        elements = await queryAll.call(page, selector);
      } catch {
        continue;
      }

    for (let index = 0; index < elements.length; index += 1) {
      if (nodes.length >= maxNodes) {
        break;
      }
      const rawElement = elements[index];
      if (!rawElement || typeof rawElement !== "object") {
        continue;
      }

      const element = rawElement as ElementLike;
      const ref = `e${nodes.length + 1}`;
      const node = await collectElementNode(element, selector, index, ref);
      const dedupeKey = `${node.tag ?? ""}|${node.text ?? ""}|${node.className ?? ""}|${selector}|${index}`;
      if (dedupeKeys.has(dedupeKey)) {
        continue;
      }
      dedupeKeys.add(dedupeKey);
      nodes.push(node);
    }
  }

  const annotatedNodes = annotateSnapshotNodes(nodes);

  const refs: JsonObject = {};
  const refMap = new Map<string, { selector: string; index: number }>();
  for (const node of annotatedNodes) {
    refs[node.ref] = {
      selector: node.selector,
      index: node.index,
      tag: node.tag ?? null,
      text: node.text ?? null,
      nth: node.nth ?? null,
    };
    refMap.set(node.ref, {
      selector: node.selector,
      index: node.index,
    });
  }

  snapshotRefsBySession.set(session.id, refMap);

  return {
    ok: true,
    sessionId: session.id,
    route: route ?? null,
    snapshot: buildSnapshotText(annotatedNodes),
    tree: buildSnapshotTree(annotatedNodes),
    refs: normalizeResult(refs),
    nodes: normalizeResult(annotatedNodes),
    truncated: annotatedNodes.length >= maxNodes,
    maxNodes,
  };
}

export async function snapshotInteractiveTree(input: SnapshotInput): Promise<JsonValue> {
  return withSessionTask(input.sessionId, "snapshot", async (session) =>
    snapshotInteractiveTreeUnlocked(session, input.maxNodes),
  );
}

export async function tapElementByRef(input: TapInput): Promise<JsonValue> {
  return withSessionTask(input.sessionId, "tap", async (session) => {
    const { element, selector, index } = await resolveElementByRef(session, input.ref);
    if (typeof element.tap !== "function") {
      throw new Error(`Element for ref ${input.ref} does not support tap()`);
    }

    await element.tap();
    await sleepMs(sanitizeNonNegativeMs(input.waitForStableMs, DEFAULT_STABLE_WAIT_MS));

    const shouldReturnSnapshot = input.returnSnapshot ?? true;
    if (shouldReturnSnapshot) {
      const snapshot = await snapshotInteractiveTreeUnlocked(session, input.maxNodes);
      return {
        ok: true,
        sessionId: session.id,
        action: {
          ref: input.ref,
          selector,
          index,
        },
        snapshot,
        ref: input.ref,
        selector,
        index,
      };
    }

    return {
      ok: true,
      sessionId: session.id,
      ref: input.ref,
      selector,
      index,
      action: null,
      snapshot: null,
    };
  });
}

export async function typeTextByRef(input: TypeInput): Promise<JsonValue> {
  return withSessionTask(input.sessionId, "type", async (session) => {
    const { element, selector, index } = await resolveElementByRef(session, input.ref);
    const inputFn = (element as { input?: (value: string) => Promise<void> }).input;
    if (typeof inputFn !== "function") {
      throw new Error(`Element for ref ${input.ref} does not support input()`);
    }

    await inputFn.call(element, input.text);
    await sleepMs(sanitizeNonNegativeMs(input.waitForStableMs, DEFAULT_STABLE_WAIT_MS));

    const shouldReturnSnapshot = input.returnSnapshot ?? true;
    if (shouldReturnSnapshot) {
      const snapshot = await snapshotInteractiveTreeUnlocked(session, input.maxNodes);
      return {
        ok: true,
        sessionId: session.id,
        ref: input.ref,
        selector,
        index,
        text: input.text,
        action: {
          ref: input.ref,
          selector,
          index,
          text: input.text,
        },
        snapshot,
      };
    }

    return {
      ok: true,
      sessionId: session.id,
      ref: input.ref,
      selector,
      index,
      text: input.text,
      action: null,
      snapshot: null,
    };
  });
}

export async function runJs(input: RunInput): Promise<StructuredRunResult> {
  return withSessionTask(input.sessionId, "run_js", async (session) =>
    executeScript(session, input.code, sanitizeTimeout(input.timeoutMs)),
  );
}

export function buildGuidePayload(): string {
  return [
    "# miniprogram-automator-mcp 使用指南",
    "",
    "## 官方文档",
    "- 总览: https://developers.weixin.qq.com/miniprogram/dev/devtools/auto/",
    "- API: https://developers.weixin.qq.com/miniprogram/dev/devtools/auto/automator.html",
    "- 快速开始: https://developers.weixin.qq.com/miniprogram/dev/devtools/auto/quick-start.html",
    "",
    "## 你需要知道的功能特性",
    "- 会话接入支持 launch 和 connect：本地直接调试时用 launch，已有运行中的 websocket 自动化端点时用 connect。",
    "- 自动化能力覆盖常见流程：观察页面、执行交互、运行脚本、截图留档。",
    "",
    "## CLI 推荐命令",
    "- launch: miniprogram-automator-mcp launch --project-path /path/to/miniprogram",
    "- connect: miniprogram-automator-mcp connect --ws-endpoint ws://127.0.0.1:9420",
    "- help: miniprogram-automator-mcp --help",
  ].join("\n");
}
