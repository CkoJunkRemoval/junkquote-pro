import "server-only";
import { OneShotJobWorker, installGracefulShutdown } from "@/lib/backgroundJobs/worker";

export async function runOneBackgroundJob() { const worker = new OneShotJobWorker(); const cleanup = installGracefulShutdown(worker); try { return await worker.processOne(); } finally { cleanup(); } }
