import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { validateProductionEnvironment } from "./environment";
const bounded = <T>(promise: Promise<T>, ms = 3000) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Health check timed out.")), ms),
    ),
  ]);
export function privateAssetRoot() {
  return path.resolve(
    process.env.PRIVATE_ASSET_STORAGE_ROOT ??
      path.join(process.cwd(), ".data", "private-assets"),
  );
}
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
      (async () => {
        const root = privateAssetRoot();
        await mkdir(root, { recursive: true });
        await access(root);
      })(),
    ).catch(() => {
      checks.storage = "failed";
    }),
  ]);
  return { ready: Object.values(checks).every((x) => x === "ok"), checks };
}
