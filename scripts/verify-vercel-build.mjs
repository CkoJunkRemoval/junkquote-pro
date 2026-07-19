import "dotenv/config";
import { spawnSync } from "node:child_process";
import pg from "pg";

const sourceValue = process.env.DATABASE_URL;
if (!sourceValue) throw new Error("DATABASE_URL is required to provision a disposable verification database.");
if (process.env.DATABASE_URL_TEST && sourceValue === process.env.DATABASE_URL_TEST)
  throw new Error("Refusing verification: DATABASE_URL equals DATABASE_URL_TEST.");
const source = new URL(sourceValue);
const sourceDatabase = decodeURIComponent(source.pathname.slice(1)).toLowerCase();
if (!sourceDatabase || sourceDatabase.includes("test"))
  throw new Error("Refusing to provision a disposable database from a test database.");

const suffix = `${Date.now()}_${process.pid}`;
const database = `junkquote_vercel_verify_${suffix}`;
if (!/^junkquote_vercel_verify_[0-9]+_[0-9]+$/.test(database))
  throw new Error("Unsafe disposable database identifier.");

const admin = new pg.Client({ connectionString: sourceValue });
await admin.connect();
try {
  await admin.query(`CREATE DATABASE "${database}"`);
  const disposable = new URL(sourceValue);
  disposable.pathname = `/${database}`;
  const environment = {
    ...process.env,
    DATABASE_URL: disposable.toString(),
    VERCEL_ENV: "production",
    VERCEL_BUILD_DISPOSABLE_VERIFY: "true",
  };
  delete environment.DATABASE_URL_TEST;
  delete environment.VERCEL;
  const result = spawnSync(process.execPath, ["scripts/vercel-build.mjs"], {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`Disposable Vercel build verification failed with exit code ${result.status ?? "unknown"}.`);
} finally {
  await admin.query(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
    [database],
  );
  await admin.query(`DROP DATABASE "${database}"`);
  await admin.end();
}

console.log(`[vercel-build] disposable verification completed and removed: ${database}`);
