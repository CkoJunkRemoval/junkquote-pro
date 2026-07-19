import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { OneShotJobWorker } from "../src/lib/backgroundJobs/worker";
async function main() {
const root = path.resolve(
  process.env.WORKER_LOCK_ROOT ?? path.join(process.cwd(), ".data"),
);
await mkdir(root, { recursive: true });
const lock = path.join(root, "worker.lock");
let handle;
try {
  handle = await open(lock, "wx");
} catch {
  throw new Error("Another beta worker appears to be active.");
}
try {
  const worker = new OneShotJobWorker();
  const limit = Math.min(
    100,
    Math.max(1, Number(process.env.WORKER_MAX_JOBS ?? 25)),
  );
  let processed = 0;
  while (processed < limit) {
    const job = await worker.processOne();
    if (!job) break;
    processed++;
  }
  process.stdout.write(
    `${JSON.stringify({ processed, completedAt: new Date().toISOString() })}\n`,
  );
} finally {
  await handle.close();
  await unlink(lock).catch(() => undefined);
}
}
void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Worker failed."}\n`);
  process.exitCode = 1;
});
