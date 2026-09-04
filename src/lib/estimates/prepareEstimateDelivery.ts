import { randomUUID } from "node:crypto";
import { sendOrEnqueueCommunication } from "@/lib/communications/queueCommunication";
import type { CommunicationProvider } from "@/lib/communications/provider";
import { AppError } from "@/lib/errors/appError";
import { prisma } from "../prisma";
import { generateApprovalToken } from "./approvalToken";
import { transitionEstimateInTransaction } from "./estimateLifecycle";
import { emitCommunicationEventForSource } from "@/lib/communications/engine";

export type EstimateDeliveryMethod = "email" | "sms" | "link" | "device";

type PrepareEstimateDeliveryDependencies = {
  provider?: CommunicationProvider;
  now?: () => Date;
  id?: () => string;
};

export async function prepareEstimateDelivery(
  companyId: string,
  estimateId: string,
  method: EstimateDeliveryMethod,
  createdByUserId?: string,
  dependencies: PrepareEstimateDeliveryDependencies = {},
) {
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId, customer: { companyId } },
    select: {
      id: true,
      displayNumber: true,
      pricingTotal: true,
      customer: { select: { email: true, firstName: true } },
      company: { select: { displayName: true, name: true } },
    },
  });
  if (!estimate) throw new AppError("NOT_FOUND", "Estimate not found.");

  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configuredBaseUrl && process.env.NODE_ENV === "production") {
    throw new AppError("PROVIDER_FAILED", "Estimate delivery configuration is incomplete.");
  }
  const baseUrl = (configuredBaseUrl ?? "http://localhost:3000").replace(/\/$/, "");
  const approvalToken = generateApprovalToken();
  const now = (dependencies.now ?? (() => new Date()))();
  const approvalTokenExpiresAt = new Date(now);
  approvalTokenExpiresAt.setDate(approvalTokenExpiresAt.getDate() + 7);
  const approvalUrl = `${baseUrl}/approve/${approvalToken}`;

  let providerMessageId: string | undefined;
  if (method === "email") {
    if (!estimate.customer.email) {
      throw new AppError("VALIDATION_FAILED", "Add a customer email address before sending this estimate.");
    }
    const estimateNumber = estimate.displayNumber ?? "Your estimate";
    const companyName = estimate.company.displayName || estimate.company.name;
    const delivery = await sendOrEnqueueCommunication(
      companyId,
      {
        channel: "email",
        to: estimate.customer.email,
        subject: `${estimateNumber} from ${companyName}`,
        body: [
          `Hi ${estimate.customer.firstName},`,
          "",
          `Your estimate from ${companyName} is ready to review.`,
          `View and approve it securely: ${approvalUrl}`,
        ].join("\n"),
        idempotencyKey: `estimate-email:${estimate.id}:${(dependencies.id ?? randomUUID)()}`,
        createdByUserId,
      },
      { workersEnabled: false, provider: dependencies.provider },
    );
    if (delivery.mode !== "synchronous") {
      throw new AppError("PROVIDER_FAILED", "Estimate email was not accepted by the provider.");
    }
    providerMessageId = delivery.result.providerMessageId;
  }

  await prisma.$transaction((tx) =>
    transitionEstimateInTransaction(tx, companyId, estimateId, "Sent", {
      actor: { label: "Team member" },
      metadata: { method, providerMessageId },
      data: {
        approvalToken,
        approvalTokenExpiresAt,
        sentAt: now,
        ...(method === "email" ? { sentByEmailAt: now } : {}),
        ...(method === "sms" ? { sentBySmsAt: now } : {}),
      },
    }),
  );
  if (method !== "email") {
    await emitCommunicationEventForSource({
      companyId,
      eventType: "ESTIMATE_SENT",
      sourceType: "Estimate",
      sourceId: estimateId,
      dedupeKey: `ESTIMATE_SENT:${estimateId}:${now.toISOString()}`,
    });
  }
  return { approvalUrl, approvalTokenExpiresAt, providerMessageId };
}
