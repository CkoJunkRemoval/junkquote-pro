import type { BackgroundJob, BackgroundJobPriority, BackgroundJobType, Prisma } from "@/generated/prisma/client";

export type EnqueueJobInput = {
  companyId: string;
  type: BackgroundJobType;
  payload: Prisma.InputJsonValue;
  priority?: BackgroundJobPriority;
  maxAttempts?: number;
  availableAt?: Date;
  createdByUserId?: string | null;
  idempotencyKey?: string;
};

export interface ReserveOptions { companyId?: string; now?: Date; staleAfterMs?: number; }
export interface FailureOptions { error: unknown; now?: Date; }

export interface JobQueue {
  enqueue(input: EnqueueJobInput): Promise<BackgroundJob>;
  reserve(options?: ReserveOptions): Promise<BackgroundJob | null>;
  complete(companyId: string, jobId: string, now?: Date): Promise<BackgroundJob>;
  fail(companyId: string, jobId: string, options: FailureOptions): Promise<BackgroundJob>;
  retry(companyId: string, jobId: string, now?: Date): Promise<BackgroundJob>;
  cancel(companyId: string, jobId: string, now?: Date): Promise<BackgroundJob>;
  recoverStale(options?: ReserveOptions): Promise<number>;
}

export interface JobWorker { processOne(options?: ReserveOptions): Promise<BackgroundJob | null>; shutdown(): void; }
