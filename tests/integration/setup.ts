import "dotenv/config";
import { requireSafeTestDatabaseUrl } from "../../scripts/test-db-safety.mjs";
import { afterAll } from "vitest";

const { testValue } = requireSafeTestDatabaseUrl();
process.env.DATABASE_URL = testValue;
afterAll(async () => {
  const { prisma } = await import("@/lib/prisma");
  await prisma.$disconnect();
});
