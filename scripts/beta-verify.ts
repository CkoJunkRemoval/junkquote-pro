import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { validateProductionEnvironment } from "../src/lib/production/environment";
import { selectCommunicationProvider } from "../src/lib/communications/provider";
import { selectObjectStorage } from "../src/lib/storage/objectStorage";
import { evaluateDependencyPolicy } from "../src/lib/beta/dependencyPolicy";
import { evaluateBetaGate, type GateCheck } from "../src/lib/beta/gate";
async function main() {
const checks: GateCheck[] = [];
const check = async (name: string, fn: () => unknown | Promise<unknown>) => {
  try {
    await fn();
    checks.push({ name, passed: true });
  } catch (error) {
    checks.push({
      name,
      passed: false,
      detail: error instanceof Error ? error.message : "failed",
    });
  }
};
await check("production-environment", () =>
  validateProductionEnvironment({ ...process.env, NODE_ENV: "production" }),
);
await check("email-provider", () => {
  const p = selectCommunicationProvider({
    ...process.env,
    NODE_ENV: "production",
  });
  if (p.name !== "resend") throw new Error("Resend is required.");
});
await check("storage-provider", async () => {
  const p = selectObjectStorage({ ...process.env, NODE_ENV: "production" });
  if (p.name !== "supabase" || !(await p.healthCheck()))
    throw new Error("Supabase private storage is unavailable.");
});
await check("worker-configuration", () => {
  if (process.env.BACKGROUND_WORKERS_ENABLED !== "true")
    throw new Error("BACKGROUND_WORKERS_ENABLED=true is required.");
});
await check("readiness", async () => {
  const { checkReadiness } = await import("../src/lib/production/readiness");
  const r = await checkReadiness();
  if (!r.ready)
    throw new Error(
      `Readiness failed: ${Object.entries(r.checks)
        .filter(([, v]) => v !== "ok")
        .map(([k]) => k)
        .join(",")}`,
    );
});
await check("backup-verification", async () => {
  if (!process.env.BETA_BACKUP_VERIFIED_AT)
    throw new Error(
      "BETA_BACKUP_VERIFIED_AT is required after a restore/backup verification.",
    );
  const { reconcilePrivateAssets } = await import(
    "../src/lib/storage/assetOperations"
  );
  const report = await reconcilePrivateAssets();
  if (!report.healthy) throw new Error("Private asset reconciliation failed.");
});
const command = process.platform === "win32" ? "npm.cmd" : "npm";
const commands = [
  ["prisma-client", ["exec", "prisma", "generate"]],
  ["migration-state", ["exec", "prisma", "migrate", "status"]],
  ["typescript", ["run", "typecheck"]],
  ["eslint", ["run", "lint"]],
  ["unit-tests", ["run", "test:unit"]],
  ["integration-tests", ["run", "test:integration"]],
  ["production-build", ["run", "build"]],
] as const;
const preflightPassed = checks.every((entry) => entry.passed);
for (const [name, args] of commands) {
  if (!preflightPassed) {
    checks.push({
      name,
      passed: false,
      detail: "Skipped because the production preflight failed.",
    });
    continue;
  }
  await check(name, () => {
    const result = spawnSync(command, args, {
      stdio: "inherit",
      env: process.env,
      shell: false,
    });
    if (result.status !== 0) throw new Error(`${name} exited ${result.status}`);
  });
}
let auditStatus = "unavailable";
await check("dependency-policy", () => {
  const result = spawnSync(command, ["audit", "--omit=dev", "--json"], {
    encoding: "utf8",
    env: process.env,
    shell: false,
    maxBuffer: 10 * 1024 * 1024,
  });
  const parsed = JSON.parse(result.stdout || "{}");
  const policy = evaluateDependencyPolicy(parsed);
  auditStatus = policy.passed ? "accepted" : "blocked";
  if (!policy.passed)
    throw new Error(
      `Unaccepted advisories: ${policy.blocking.map((x) => x.name).join(", ")}`,
    );
});
let commit = "unknown";
try {
  commit =
    spawnSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).stdout.trim() || "unknown";
} catch {}
const migrationCount = (
  await readdir("prisma/migrations", { withFileTypes: true })
).filter((x) => x.isDirectory()).length;
const gate = evaluateBetaGate(checks);
const report = {
  timestamp: new Date().toISOString(),
  commit,
  migrationCount,
  tests: {
    unit: process.env.BETA_UNIT_TOTAL ?? "run by gate",
    integration: process.env.BETA_INTEGRATION_TOTAL ?? "run by gate",
  },
  build: checks.find((x) => x.name === "production-build")?.passed ?? false,
  emailProvider: checks.find((x) => x.name === "email-provider")?.passed
    ? "resend:configured"
    : "blocked",
  storageProvider: checks.find((x) => x.name === "storage-provider")?.passed
    ? "supabase:healthy"
    : "blocked",
  dependencyAdvisories: auditStatus,
  backupVerification: process.env.BETA_BACKUP_VERIFIED_AT ?? "not verified",
  workerConfiguration: checks.find((x) => x.name === "worker-configuration")
    ?.passed
    ? "single-worker"
    : "blocked",
  openWarnings: checks
    .filter((x) => !x.passed)
    .map((x) => ({ check: x.name, detail: x.detail })),
  gate: gate.passed ? "PASS" : "FAIL",
};
await writeFile("beta-readiness-report.json", JSON.stringify(report, null, 2));
await writeFile(
  "beta-readiness-report.md",
  `# Beta readiness report\n\n- Timestamp: ${report.timestamp}\n- Commit: ${report.commit}\n- Migrations: ${migrationCount}\n- Build: ${report.build ? "passed" : "failed"}\n- Email: ${report.emailProvider}\n- Storage: ${report.storageProvider}\n- Advisories: ${report.dependencyAdvisories}\n- Backup verification: ${report.backupVerification}\n- Worker: ${report.workerConfiguration}\n- Final gate: **${report.gate}**\n\n## Open warnings\n${report.openWarnings.map((x) => `- ${x.check}: ${x.detail}`).join("\n") || "None"}\n`,
);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!gate.passed) process.exitCode = 1;
}
void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Beta verification failed."}\n`);
  process.exitCode = 1;
});
