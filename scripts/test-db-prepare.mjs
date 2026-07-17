import "dotenv/config";
import { spawnSync } from "node:child_process";
import { requireSafeTestDatabaseUrl } from "./test-db-safety.mjs";

const { testValue: databaseUrl } = requireSafeTestDatabaseUrl();
const command = process.platform === "win32" ? "npx.cmd" : "npx";
for (const args of [["prisma", "migrate", "reset", "--force"], ["prisma", "migrate", "deploy"], ["prisma", "generate"]]) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, DATABASE_URL: databaseUrl, DATABASE_URL_TEST: databaseUrl } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
