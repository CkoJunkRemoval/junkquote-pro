import type { BackgroundJob, Prisma } from "@/generated/prisma/client";
import { Prisma as PrismaNamespace } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { retryDelayMs } from "./backoff";
import type { EnqueueJobInput, FailureOptions, JobQueue, ReserveOptions } from "./types";

const priorityWeight = { Critical: 4, High: 3, Normal: 2, Low: 1 } as const;
const errorMessage = (error: unknown) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, 4_000);

export class DatabaseJobQueue implements JobQueue {
  async enqueue(input: EnqueueJobInput) {
    if (input.maxAttempts !== undefined && (!Number.isInteger(input.maxAttempts) || input.maxAttempts < 1 || input.maxAttempts > 100)) throw new Error("maxAttempts must be from 1 to 100.");
    const company = await prisma.company.findFirst({ where: { id: input.companyId, active: true }, select: { id: true } });
    if (!company) throw new Error("Company not found.");
    if (input.createdByUserId) { const creator = await prisma.user.findFirst({ where: { id: input.createdByUserId, companyId: input.companyId, memberships: { some: { companyId: input.companyId, status: "Active" } } }, select: { id: true } }); if (!creator) throw new Error("Job creator not found."); }
    if (input.idempotencyKey) { const existing = await prisma.backgroundJob.findFirst({ where: { companyId: input.companyId, type: input.type, idempotencyKey: input.idempotencyKey } }); if (existing) return existing; }
    try { return await prisma.backgroundJob.create({ data: { companyId: input.companyId, type: input.type, payload: input.payload, priority: input.priority ?? "Normal", maxAttempts: input.maxAttempts ?? 3, availableAt: input.availableAt ?? new Date(), createdByUserId: input.createdByUserId ?? null, idempotencyKey: input.idempotencyKey?.trim() || null } }); }
    catch (error) { if (input.idempotencyKey && error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === "P2002") { const existing = await prisma.backgroundJob.findFirst({ where: { companyId: input.companyId, type: input.type, idempotencyKey: input.idempotencyKey } }); if (existing) return existing; } throw error; }
  }

  async recoverStale(options: ReserveOptions = {}) { const now = options.now ?? new Date(); const staleBefore = new Date(now.getTime() - (options.staleAfterMs ?? 15 * 60_000)); const result = await prisma.backgroundJob.updateMany({ where: { ...(options.companyId ? { companyId: options.companyId } : {}), status: "Running", startedAt: { lt: staleBefore } }, data: { status: "Pending", availableAt: now, startedAt: null, lastError: "Recovered stale running job." } }); return result.count; }

  async reserve(options: ReserveOptions = {}) {
    const now = options.now ?? new Date(); await this.recoverStale({ ...options, now });
    return prisma.$transaction(async (tx) => {
      const candidates = await tx.backgroundJob.findMany({ where: { ...(options.companyId ? { companyId: options.companyId } : {}), status: "Pending", availableAt: { lte: now }, attempts: { lt: 100 }, company: { active: true } }, take: 20, orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }] });
      candidates.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority] || a.availableAt.getTime() - b.availableAt.getTime() || a.createdAt.getTime() - b.createdAt.getTime());
      for (const candidate of candidates) { if (candidate.attempts >= candidate.maxAttempts) { await tx.backgroundJob.updateMany({ where: { id: candidate.id, status: "Pending" }, data: { status: "Failed", completedAt: now, lastError: candidate.lastError ?? "Maximum attempts reached." } }); continue; } const claimed = await tx.backgroundJob.updateMany({ where: { id: candidate.id, companyId: candidate.companyId, status: "Pending", availableAt: { lte: now } }, data: { status: "Running", attempts: { increment: 1 }, startedAt: now, completedAt: null } }); if (claimed.count === 1) return tx.backgroundJob.findUnique({ where: { id: candidate.id } }); }
      return null;
    });
  }

  async complete(companyId: string, jobId: string, now = new Date()) { return this.transition(companyId, jobId, { status: "Completed", completedAt: now, lastError: null }, ["Running"]); }
  async fail(companyId: string, jobId: string, options: FailureOptions) { const now = options.now ?? new Date(); const job = await prisma.backgroundJob.findFirst({ where: { id: jobId, companyId, status: "Running" } }); if (!job) throw new Error("Running job not found."); const terminal = job.attempts >= job.maxAttempts; return prisma.backgroundJob.update({ where: { id: job.id }, data: terminal ? { status: "Failed", completedAt: now, lastError: errorMessage(options.error) } : { status: "Pending", startedAt: null, availableAt: new Date(now.getTime() + retryDelayMs(job.attempts)), lastError: errorMessage(options.error) } }); }
  async retry(companyId: string, jobId: string, now = new Date()) { const job = await prisma.backgroundJob.findFirst({ where: { id: jobId, companyId, status: { in: ["Failed", "Cancelled"] } } }); if (!job) throw new Error("Retryable job not found."); return prisma.backgroundJob.update({ where: { id: job.id }, data: { status: "Pending", attempts: 0, availableAt: now, startedAt: null, completedAt: null, lastError: null } }); }
  async cancel(companyId: string, jobId: string, now = new Date()) { return this.transition(companyId, jobId, { status: "Cancelled", completedAt: now }, ["Pending", "Running", "Failed"]); }
  private async transition(companyId: string, jobId: string, data: Prisma.BackgroundJobUpdateInput, statuses: BackgroundJob["status"][]) { const job = await prisma.backgroundJob.findFirst({ where: { id: jobId, companyId, status: { in: statuses } }, select: { id: true } }); if (!job) throw new Error("Background job not found."); return prisma.backgroundJob.update({ where: { id: job.id }, data }); }
}

export const databaseJobQueue = new DatabaseJobQueue();
