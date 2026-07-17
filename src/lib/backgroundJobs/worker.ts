import type { BackgroundJob } from "@/generated/prisma/client";
import { databaseJobQueue } from "./databaseQueue";
import { createBackgroundJobHandlers, type BackgroundJobHandler } from "./handlers";
import { consoleJobLogger, type JobLogger } from "./logger";
import type { JobQueue, JobWorker, ReserveOptions } from "./types";

export class OneShotJobWorker implements JobWorker {
  private stopped = false;
  constructor(private readonly queue: JobQueue = databaseJobQueue, private readonly handlers: Partial<Record<BackgroundJob["type"], BackgroundJobHandler>> = createBackgroundJobHandlers(), private readonly logger: JobLogger = consoleJobLogger) {}
  shutdown() { this.stopped = true; }
  async processOne(options: ReserveOptions = {}) { if (this.stopped) return null; const job = await this.queue.reserve(options); if (!job || this.stopped) return job; const started = Date.now(); this.logger.log("info", "background_job.started", { jobId: job.id, companyId: job.companyId, type: job.type, attempt: job.attempts }); try { const handler = this.handlers[job.type]; if (!handler) throw new Error(`No handler registered for ${job.type}.`); await handler(job); const completed = await this.queue.complete(job.companyId, job.id); this.logger.log("info", "background_job.completed", { jobId: job.id, companyId: job.companyId, type: job.type, attempt: job.attempts, durationMs: Date.now() - started }); return completed; } catch (error) { const failed = await this.queue.fail(job.companyId, job.id, { error }); this.logger.log("error", "background_job.failed", { jobId: job.id, companyId: job.companyId, type: job.type, attempt: job.attempts, finalStatus: failed.status, durationMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) }); return failed; } }
}

export function installGracefulShutdown(worker: JobWorker) { const shutdown = () => worker.shutdown(); process.once("SIGINT", shutdown); process.once("SIGTERM", shutdown); return () => { process.off("SIGINT", shutdown); process.off("SIGTERM", shutdown); }; }
