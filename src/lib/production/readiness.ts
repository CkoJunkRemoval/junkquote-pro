import { prisma } from "@/lib/prisma";
import { inspectProductionEnvironment } from "./environment";
import { selectObjectStorage } from "@/lib/storage/objectStorage";
import { coordinationStore } from "@/lib/distributed/store";
const bounded = <T>(promise: Promise<T>, ms = 3000) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Health check timed out.")), ms),
    ),
  ]);
export async function checkReadiness() {
  const checks: Record<string, "ok" | "degraded" | "failed"> = {
    configuration: "ok",
    database: "ok",
    schema: "ok",
    storage: "ok",
    redis: "ok",
  };
  const environment = inspectProductionEnvironment();
  if (environment.errors.length) checks.configuration = "failed";
  await Promise.all([
    bounded(prisma.$queryRaw`SELECT 1`).catch(() => {
      checks.database = "failed";
    }),
    bounded(prisma.auditEvent.count({ take: 1 })).catch(() => {
      checks.schema = "failed";
    }),
    bounded(
      Promise.resolve()
        .then(() => selectObjectStorage().healthCheck())
        .then((ok) => {
          if (!ok) throw new Error("Storage unavailable.");
        }),
    ).catch(() => {
      checks.storage = "failed";
    }),
    bounded(
      coordinationStore()
        .health()
        .then((health) => {
          if (!health.ok) throw new Error("Redis unavailable.");
          if (health.mode !== "redis") checks.redis = "degraded";
        }),
    ).catch(() => {
      checks.redis = "failed";
    }),
  ]);
  return {
    ready: [
      checks.configuration,
      checks.database,
      checks.schema,
      checks.storage,
    ].every((x) => x === "ok"),
    checks,
    warnings: environment.warnings,
    optionalFeatures: environment.features,
  };
}
