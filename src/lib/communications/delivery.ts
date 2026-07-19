import { createHash } from "node:crypto";
import type { CommunicationDeliveryStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { CommunicationMessage } from "./provider";
const recipientHash = (to: string) =>
  createHash("sha256").update(to.trim().toLowerCase()).digest("hex");
export async function beginDelivery(input: {
  companyId: string;
  backgroundJobId?: string;
  idempotencyKey: string;
  provider: string;
  message: CommunicationMessage;
  requestId?: string;
}) {
  return prisma.communicationDelivery.upsert({
    where: {
      companyId_idempotencyKey: {
        companyId: input.companyId,
        idempotencyKey: input.idempotencyKey,
      },
    },
    create: {
      companyId: input.companyId,
      backgroundJobId: input.backgroundJobId,
      idempotencyKey: input.idempotencyKey,
      provider: input.provider,
      channel: input.message.channel,
      recipientHash: recipientHash(input.message.to),
      requestId: input.requestId,
      status: "Pending",
    },
    update: { requestId: input.requestId ?? undefined },
  });
}
export async function markDeliverySent(id: string, providerMessageId: string) {
  return prisma.communicationDelivery.update({
    where: { id },
    data: {
      status: "Sent",
      providerMessageId,
      sentAt: new Date(),
      lastErrorCode: null,
    },
  });
}
export async function markDeliveryFailed(id: string, error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "PROVIDER_FAILED";
  return prisma.communicationDelivery.update({
    where: { id },
    data: {
      status: "Failed",
      failedAt: new Date(),
      lastErrorCode: code.slice(0, 100),
    },
  });
}
const webhookStates: Record<string, CommunicationDeliveryStatus | undefined> = {
  "email.sent": "Sent",
  "email.delivered": "Delivered",
  "email.bounced": "Bounced",
  "email.failed": "Failed",
  "email.complained": "Rejected",
};
export async function applyDeliveryWebhook(input: {
  providerEventId: string;
  eventType: string;
  providerMessageId: string;
  occurredAt: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.providerWebhookEvent.findUnique({
      where: { providerEventId: input.providerEventId },
    });
    if (existing) return { duplicate: true, event: existing };
    const delivery = await tx.communicationDelivery.findUnique({
      where: { providerMessageId: input.providerMessageId },
    });
    const status = webhookStates[input.eventType];
    const event = await tx.providerWebhookEvent.create({
      data: {
        companyId: delivery?.companyId,
        provider: "resend",
        providerEventId: input.providerEventId,
        eventType: input.eventType,
        providerMessageId: input.providerMessageId,
        occurredAt: input.occurredAt,
      },
    });
    if (delivery && status)
      await tx.communicationDelivery.update({
        where: { id: delivery.id },
        data: {
          status,
          ...(status === "Delivered"
            ? { deliveredAt: input.occurredAt }
            : status === "Bounced"
              ? { bouncedAt: input.occurredAt }
              : status === "Rejected"
                ? { rejectedAt: input.occurredAt }
                : status === "Failed"
                  ? { failedAt: input.occurredAt }
                  : { sentAt: input.occurredAt }),
        },
      });
    return { duplicate: false, event };
  });
}
