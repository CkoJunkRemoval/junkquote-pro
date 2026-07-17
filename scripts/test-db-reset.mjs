import "dotenv/config";
import { spawnSync } from "node:child_process";
import { requireSafeTestDatabaseUrl } from "./test-db-safety.mjs";
const { testValue } = requireSafeTestDatabaseUrl();
const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["prisma", "migrate", "reset", "--force"], { stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, DATABASE_URL: testValue, DATABASE_URL_TEST: testValue } });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
