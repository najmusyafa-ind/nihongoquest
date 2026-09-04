// src/lib/logger.ts
// Lightweight structured logger -- zero dependencies, safe for Next.js App Router.
// Works in Node.js runtime AND Edge Runtime (no Node.js internals used).
//
// Usage:
//   import { childLogger } from "@/lib/logger";
//   const log = childLogger("MyService");
//   log.error("Something failed", error);   // error can be Error | unknown | object
//   log.warn("Slow query", { duration: 120 });

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel: number =
  LEVELS[(process.env["LOG_LEVEL"] as LogLevel) ?? "info"] ??
  (process.env["NODE_ENV"] === "production" ? LEVELS.info : LEVELS.debug);

const isDev = process.env["NODE_ENV"] !== "production";

// Normalize any second argument into a plain object safe for JSON.stringify
function toCtx(ctx: unknown): Record<string, unknown> {
  if (ctx === null || ctx === undefined) return {};
  if (ctx instanceof Error) return { err: ctx.message, stack: ctx.stack };
  if (typeof ctx === "object") return ctx as Record<string, unknown>;
  return { value: ctx };
}

function emit(level: LogLevel, service: string, msg: string, ctx: unknown): void {
  if (LEVELS[level] < minLevel) return;

  const safe = toCtx(ctx);
  // Redact common secret fields
  for (const key of ["password", "token", "accessToken", "refreshToken", "apiKey"]) {
    if (key in safe) safe[key] = "[REDACTED]";
  }

  if (isDev) {
    const COLOR: Record<LogLevel, string> = {
      debug: "\x1b[36m", info: "\x1b[32m", warn: "\x1b[33m", error: "\x1b[31m",
    };
    const R = "\x1b[0m";
    const ts = new Date().toTimeString().slice(0, 8);
    const ctxStr = Object.keys(safe).length ? " " + JSON.stringify(safe) : "";
    const line = `${COLOR[level]}[${ts}] ${level.toUpperCase()} [${service}]${R} ${msg}${ctxStr}`;
    if (level === "error") { console.error(line); return; }
    if (level === "warn")  { console.warn(line);  return; }
    console.log(line);
    return;
  }

  // Production: structured JSON to stdout
  const entry = JSON.stringify({
    level, timestamp: new Date().toISOString(), service, message: msg, ...safe,
  });
  if (level === "error") { console.error(entry); return; }
  if (level === "warn")  { console.warn(entry);  return; }
  console.log(entry);
}

export function childLogger(service: string) {
  return {
    debug: (msg: string, ctx: unknown = {}) => emit("debug", service, msg, ctx),
    info:  (msg: string, ctx: unknown = {}) => emit("info",  service, msg, ctx),
    warn:  (msg: string, ctx: unknown = {}) => emit("warn",  service, msg, ctx),
    error: (msg: string, ctx: unknown = {}) => emit("error", service, msg, ctx),
  };
}

// Alias
export const createLogger = childLogger;

// Default app-level logger
export const logger = childLogger("nihongoquest");
