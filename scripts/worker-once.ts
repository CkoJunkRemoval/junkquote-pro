import { OneShotJobWorker } from "../src/lib/backgroundJobs/worker";
import { withDistributedLock } from "../src/lib/distributed/locks";

async function main() {
  return withDistributedLock("queue-worker", "global", 15 * 60_000, async () => {
    const worker = new OneShotJobWorker();
    const limit = Math.min(100, Math.max(1, Number(process.env.WORKER_MAX_JOBS ?? 25)));
    let processed = 0;
    while (processed < limit) {
      const job = await worker.processOne();
      if (!job) break;
      processed++;
    }
    process.stdout.write(`${JSON.stringify({ processed, completedAt: new Date().toISOString() })}\n`);
  });
}
void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Worker failed."}\n`);
  process.exitCode = 1;
});
