import type { BackgroundJobPriority } from "@/generated/prisma/client";
import { databaseJobQueue } from "@/lib/backgroundJobs/databaseQueue";
import type { JobQueue } from "@/lib/backgroundJobs/types";
import { consoleEmailProvider, type CommunicationMessage, type CommunicationProvider } from "./provider";

export type QueueCommunicationInput = CommunicationMessage & { idempotencyKey: string; priority?: BackgroundJobPriority; availableAt?: Date; createdByUserId?: string | null };
export async function enqueueCommunication(companyId: string, input: QueueCommunicationInput, queue: JobQueue = databaseJobQueue) { return queue.enqueue({ companyId, type: "SendCommunication", payload: { channel: input.channel, to: input.to, subject: input.subject ?? null, body: input.body }, priority: input.priority, availableAt: input.availableAt, createdByUserId: input.createdByUserId, idempotencyKey: input.idempotencyKey }); }
export async function sendOrEnqueueCommunication(companyId: string, input: QueueCommunicationInput, options: { workersEnabled?: boolean; queue?: JobQueue; provider?: CommunicationProvider } = {}) { if (options.workersEnabled ?? process.env.BACKGROUND_WORKERS_ENABLED === "true") return { mode: "queued" as const, job: await enqueueCommunication(companyId, input, options.queue) }; return { mode: "synchronous" as const, result: await (options.provider ?? consoleEmailProvider).send(input, { idempotencyKey: input.idempotencyKey }) }; }
