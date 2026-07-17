"use server";
import type { BackgroundJobPriority } from "@/generated/prisma/client";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import { enqueueEstimatePdf, enqueueInvoicePdf, enqueueReceipt } from "@/lib/backgroundJobs/pdfQueue";
import { enqueueCommunication, type QueueCommunicationInput } from "@/lib/communications/queueCommunication";

export async function enqueueCommunicationAction(input: Omit<QueueCommunicationInput, "createdByUserId">) { const context = await requireOperationalTenant(); return enqueueCommunication(context.companyId, { ...input, createdByUserId: context.user.id }); }
export async function enqueueEstimatePdfAction(estimateId: string) { const context = await requireOperationalTenant(); return enqueueEstimatePdf(context.companyId, estimateId, context.user.id); }
export async function enqueueInvoicePdfAction(invoiceId: string) { const context = await requireOperationalTenant(); return enqueueInvoicePdf(context.companyId, invoiceId, context.user.id); }
export async function enqueueReceiptAction(paymentId: string) { const context = await requireOperationalTenant(); return enqueueReceipt(context.companyId, paymentId, context.user.id); }
export type EnqueuePriority = BackgroundJobPriority;
