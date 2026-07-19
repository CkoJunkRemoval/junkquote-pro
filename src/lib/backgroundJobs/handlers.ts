import type { BackgroundJob } from "@/generated/prisma/client";
import { buildPublicEstimatePdf } from "@/data/output/buildPublicEstimatePdf";
import { renderEstimatePdf } from "@/data/output/renderEstimatePdf";
import { renderInvoicePdf } from "@/data/output/renderInvoicePdf";
import { renderPaymentReceiptPdf } from "@/data/output/renderPaymentReceiptPdf";
import {
  selectCommunicationProvider,
  type CommunicationProvider,
} from "@/lib/communications/provider";
import {
  beginDelivery,
  markDeliveryFailed,
  markDeliverySent,
} from "@/lib/communications/delivery";
import { getEstimatePdfData } from "@/lib/estimates/getEstimatePdfData";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
import { getPaymentReceiptData } from "@/lib/payments/listInvoicePayments";
import { prisma } from "@/lib/prisma";
import { generateDueServicePlanJobs } from "@/lib/servicePlans/servicePlans";

type JsonObject = Record<string, unknown>;
const objectPayload = (job: BackgroundJob) => {
  if (
    !job.payload ||
    Array.isArray(job.payload) ||
    typeof job.payload !== "object"
  )
    throw new Error("Invalid job payload.");
  return job.payload as JsonObject;
};
const stringField = (payload: JsonObject, key: string) => {
  const value = payload[key];
  if (typeof value !== "string" || !value) throw new Error(`Missing ${key}.`);
  return value;
};
export type BackgroundJobHandler = (job: BackgroundJob) => Promise<void>;

export function createBackgroundJobHandlers(
  provider: CommunicationProvider = selectCommunicationProvider(),
): Partial<Record<BackgroundJob["type"], BackgroundJobHandler>> {
  return {
    async SendCommunication(job) {
      const payload = objectPayload(job);
      const message = {
        channel: stringField(payload, "channel") as
          | "email"
          | "sms"
          | "reminder",
        to: stringField(payload, "to"),
        subject:
          typeof payload.subject === "string" ? payload.subject : undefined,
        body: stringField(payload, "body"),
      };
      const idempotencyKey = job.idempotencyKey ?? job.id;
      const requestId = `job-${job.id}`;
      const delivery = await beginDelivery({
        companyId: job.companyId,
        backgroundJobId: job.id,
        idempotencyKey,
        provider: provider.name ?? "custom",
        message,
        requestId,
      });
      try {
        const sent = await provider.send(message, {
          idempotencyKey,
          requestId,
          communicationId: delivery.id,
        });
        await markDeliverySent(delivery.id, sent.providerMessageId);
      } catch (error) {
        await markDeliveryFailed(delivery.id, error);
        throw error;
      }
    },
    async GenerateEstimatePdf(job) {
      const id = stringField(objectPayload(job), "recordId");
      const data = await getEstimatePdfData(job.companyId, id);
      await renderEstimatePdf(buildPublicEstimatePdf(data));
    },
    async GenerateInvoicePdf(job) {
      const id = stringField(objectPayload(job), "recordId");
      const data = await getInvoiceDetail(job.companyId, id);
      if (!data) throw new Error("Invoice not found.");
      await renderInvoicePdf(data);
    },
    async GenerateReceipt(job) {
      const id = stringField(objectPayload(job), "recordId");
      const data = await getPaymentReceiptData(job.companyId, id);
      if (!data) throw new Error("Payment not found.");
      await renderPaymentReceiptPdf(data);
    },
    async ScheduledReminder(job) {
      const payload = objectPayload(job);
      const message = {
        channel: "reminder",
        to: stringField(payload, "to"),
        subject:
          typeof payload.subject === "string" ? payload.subject : undefined,
        body: stringField(payload, "body"),
      } as const;
      const idempotencyKey = job.idempotencyKey ?? job.id;
      const requestId = `job-${job.id}`;
      const delivery = await beginDelivery({
        companyId: job.companyId,
        backgroundJobId: job.id,
        idempotencyKey,
        provider: provider.name ?? "custom",
        message,
        requestId,
      });
      try {
        const sent = await provider.send(message, {
          idempotencyKey,
          requestId,
          communicationId: delivery.id,
        });
        await markDeliverySent(delivery.id, sent.providerMessageId);
      } catch (error) {
        await markDeliveryFailed(delivery.id, error);
        throw error;
      }
    },
    async CleanupFiles(job) {
      const company = await prisma.company.findFirst({
        where: { id: job.companyId, active: true },
        select: { id: true },
      });
      if (!company) throw new Error("Company not found.");
    },
    async ServicePlanGeneration(job) {
      const payload = objectPayload(job);
      const through =
        typeof payload.through === "string"
          ? new Date(payload.through)
          : new Date();
      if (Number.isNaN(through.getTime()))
        throw new Error("Invalid through date.");
      await generateDueServicePlanJobs(job.companyId, { through });
    },
  };
}
