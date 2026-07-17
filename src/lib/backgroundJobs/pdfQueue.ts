import { databaseJobQueue } from "./databaseQueue";
import type { JobQueue } from "./types";

type PdfKind = "estimate" | "invoice" | "receipt";
const typeByKind = { estimate: "GenerateEstimatePdf", invoice: "GenerateInvoicePdf", receipt: "GenerateReceipt" } as const;
export function enqueuePdf(companyId: string, kind: PdfKind, recordId: string, input: { createdByUserId?: string | null; idempotencyKey?: string } = {}, queue: JobQueue = databaseJobQueue) { return queue.enqueue({ companyId, type: typeByKind[kind], payload: { recordId }, createdByUserId: input.createdByUserId, idempotencyKey: input.idempotencyKey ?? `${kind}:${recordId}` }); }
export const enqueueEstimatePdf = (companyId: string, estimateId: string, createdByUserId?: string | null, queue?: JobQueue) => enqueuePdf(companyId, "estimate", estimateId, { createdByUserId }, queue);
export const enqueueInvoicePdf = (companyId: string, invoiceId: string, createdByUserId?: string | null, queue?: JobQueue) => enqueuePdf(companyId, "invoice", invoiceId, { createdByUserId }, queue);
export const enqueueReceipt = (companyId: string, paymentId: string, createdByUserId?: string | null, queue?: JobQueue) => enqueuePdf(companyId, "receipt", paymentId, { createdByUserId }, queue);
