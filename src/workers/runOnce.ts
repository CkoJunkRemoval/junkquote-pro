import "server-only";
import { OneShotJobWorker, installGracefulShutdown } from "@/lib/backgroundJobs/worker";
import { withDistributedLock } from "@/lib/distributed/locks";

export async function runOneBackgroundJob() { return withDistributedLock("queue-worker", "global", 5 * 60_000, async () => { const worker = new OneShotJobWorker(); const cleanup = installGracefulShutdown(worker); try { return await worker.processOne(); } finally { cleanup(); } }); }
