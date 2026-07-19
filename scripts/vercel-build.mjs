import { spawnSync } from "node:child_process";
import path from "node:path";
import { productionDatabaseUrl } from "./vercel-build-safety.mjs";

const prismaCli = path.resolve("node_modules/prisma/build/index.js");
const nextCli = path.resolve("node_modules/next/dist/bin/next");

function run(script, args, label, environment = process.env) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: "inherit",
    shell: false,
    env: environment,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
}

const deployment = process.env.VERCEL_ENV;
if (deployment === "production") {
  const target = productionDatabaseUrl();
  if (process.env.VERCEL !== "1" && !target.disposableVerification)
    throw new Error("Production migration deployment must run on Vercel.");
  console.log(
    `[vercel-build] applying migrations to ${target.host}/${target.database}`,
  );
  const migrationEnvironment = { ...process.env, DATABASE_URL: target.value };
  delete migrationEnvironment.DATABASE_URL_TEST;
  run(prismaCli, ["migrate", "deploy"], "Prisma migrate deploy", migrationEnvironment);
} else if (deployment === "preview" || deployment === "development") {
  console.log(`[vercel-build] ${deployment} deployment: database migrations skipped`);
} else {
  throw new Error("VERCEL_ENV must be production, preview, or development.");
}

run(nextCli, ["build"], "Next.js production build");
