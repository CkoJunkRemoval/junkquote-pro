import { prisma } from "@/lib/prisma";
import { validateProductionEnvironment } from "./environment";
import { selectObjectStorage } from "@/lib/storage/objectStorage";
const bounded = <T>(promise: Promise<T>, ms = 3000) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Health check timed out.")), ms),
    ),
  ]);
export async function checkReadiness() {
  const checks: Record<string, "ok" | "failed"> = {
    configuration: "ok",
    database: "ok",
    schema: "ok",
    storage: "ok",
  };
  try {
    validateProductionEnvironment();
  } catch {
    checks.configuration = "failed";
  }
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
  ]);
  return { ready: Object.values(checks).every((x) => x === "ok"), checks };
}
