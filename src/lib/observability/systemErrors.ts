import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { withDistributedLock } from "@/lib/distributed/locks";

const sensitiveKey = /password|secret|token|cookie|authorization|api.?key|database.?url/i;
export function redactTelemetry(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]";
  if (typeof value === "string") {
    let result = value
      .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[REDACTED]@")
      .replace(/(bearer\s+)[^\s,;]+/gi, "$1[REDACTED]")
      .replace(/((?:password|secret|token|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, "$1[REDACTED]");
    for (const name of ["DATABASE_URL", "DATABASE_URL_TEST", "AUTH_SECRET", "STRIPE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY"]) {
      const secret = process.env[name];
      if (secret && secret.length >= 4) result = result.replaceAll(secret, "[REDACTED]");
    }
    return result.slice(0, 2000);
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactTelemetry(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, item]) => [key, sensitiveKey.test(key) ? "[REDACTED]" : redactTelemetry(item, depth + 1)]));
  return value;
}

export async function captureSystemError(input: { companyId?: string; source: "server" | "client" | "api" | "database" | "slow_request"; error: unknown; requestId?: string; path?: string; durationMs?: number; metadata?: Record<string, unknown> }) {
  const message = String(redactTelemetry(input.error instanceof Error ? input.error.message : input.error));
  return prisma.systemErrorEvent.create({ data: { companyId: input.companyId, source: input.source, severity: input.source === "slow_request" ? "warning" : "error", message, fingerprint: createHash("sha256").update(`${input.source}:${message}`).digest("hex").slice(0, 32), requestId: input.requestId, path: input.path?.slice(0, 1000), durationMs: input.durationMs, metadata: redactTelemetry(input.metadata) as Prisma.InputJsonValue | undefined } });
}

export async function purgeExpiredSystemTelemetry(retentionDays = 90) {
  if (!Number.isInteger(retentionDays) || retentionDays < 30) throw new Error("Telemetry retention must be at least 30 days.");
  const before = new Date(Date.now() - retentionDays * 86_400_000);
  return withDistributedLock("telemetry-cleanup", "global", 10 * 60_000, () => prisma.systemErrorEvent.deleteMany({ where: { createdAt: { lt: before } } }));
}
