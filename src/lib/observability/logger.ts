type Level = "debug" | "info" | "warn" | "error";
const sensitive =
  /password|secret|token|cookie|authorization|signature|card|paymentData|messageBody|privatePath/i;
function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[TRUNCATED]";
  if (value instanceof Error)
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === "production" ? undefined : value.stack,
    };
  if (Array.isArray(value))
    return value.slice(0, 100).map((x) => sanitize(x, depth + 1));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        sensitive.test(k) ? "[REDACTED]" : sanitize(v, depth + 1),
      ]),
    );
  return value;
}
export function log(
  level: Level,
  event: string,
  context: Record<string, unknown> = {},
) {
  const entry = sanitize({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  });
  if (process.env.NODE_ENV === "production")
    console[level === "debug" ? "log" : level](JSON.stringify(entry));
  else
    console[level === "debug" ? "log" : level](
      `[${level.toUpperCase()}] ${event}`,
      entry,
    );
}
export const logger = {
  debug: (e: string, c?: Record<string, unknown>) => log("debug", e, c),
  info: (e: string, c?: Record<string, unknown>) => log("info", e, c),
  warn: (e: string, c?: Record<string, unknown>) => log("warn", e, c),
  error: (e: string, c?: Record<string, unknown>) => log("error", e, c),
};
export { sanitize as redactLogData };
