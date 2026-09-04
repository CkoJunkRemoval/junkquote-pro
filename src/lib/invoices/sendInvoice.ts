import { randomUUID } from "node:crypto";
import { renderInvoicePdf } from "@/data/output/renderInvoicePdf";
import { sendOrEnqueueCommunication } from "@/lib/communications/queueCommunication";
import {
  selectCommunicationProvider,
  type CommunicationProvider,
} from "@/lib/communications/provider";
import { AppError } from "@/lib/errors/appError";
import { recordEstimateEventInTransaction } from "@/lib/estimates/estimateEvents";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
import { customerInvoicePaymentUrl } from "@/lib/invoices/paymentLink";
import { prisma } from "@/lib/prisma";

export type SendInvoiceInput = {
  recipient: string;
  subject: string;
  message: string;
};

type SendInvoiceDependencies = {
  provider?: CommunicationProvider;
  renderPdf?: typeof renderInvoicePdf;
  now?: () => Date;
  id?: () => string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

function providerFailureDetails(error: unknown) {
  return error instanceof AppError
    ? {
        code: error.code,
        providerStatus:
          typeof error.details?.providerStatus === "number"
            ? error.details.providerStatus
            : undefined,
      }
    : { code: "UNEXPECTED_PROVIDER_ERROR" };
}

export async function sendInvoice(
  companyId: string,
  invoiceId: string,
  origin: string,
  createdByUserId: string,
  input: SendInvoiceInput,
  dependencies: SendInvoiceDependencies = {},
) {
  const invoice = await getInvoiceDetail(companyId, invoiceId);
  if (!invoice) throw new AppError("NOT_FOUND", "Invoice not found.");
  if (invoice.status === "Void" || invoice.status === "Cancelled") {
    throw new AppError("VALIDATION_FAILED", "Void or cancelled invoices cannot be sent.");
  }

  const recipient = input.recipient.trim();
  const subject = input.subject.trim();
  const customMessage = input.message.trim();
  if (!recipient) {
    throw new AppError("VALIDATION_FAILED", "Enter a recipient email address.");
  }
  if (!emailPattern.test(recipient) || recipient.length > 320) {
    throw new AppError("VALIDATION_FAILED", "Enter a valid recipient email address.");
  }
  if (!subject || subject.length > 200) {
    throw new AppError("VALIDATION_FAILED", "Enter a subject under 200 characters.");
  }
  if (!customMessage || customMessage.length > 2_000) {
    throw new AppError("VALIDATION_FAILED", "Enter a message under 2,000 characters.");
  }

  const invoiceNumber = invoice.displayNumber ?? `Invoice #${invoice.invoiceNumber}`;
  const companyName = invoice.company.displayName ?? invoice.company.name;
  const paymentUrl = customerInvoicePaymentUrl(origin, invoice);
  const body = [
    `Hi ${invoice.customer.firstName},`,
    "",
    customMessage,
    "",
    `Invoice: ${invoiceNumber}`,
    `Amount due: ${money(invoice.balanceDue)}`,
    `Due date: ${invoice.dueDate ? invoice.dueDate.toLocaleDateString("en-US") : "On receipt"}`,
    ...(paymentUrl
      ? ["", "View your invoice and payment options:", paymentUrl]
      : []),
    "",
    "Thank you,",
    companyName,
  ].join("\n");
  const pdf = await (dependencies.renderPdf ?? renderInvoicePdf)(invoice);
  const safeInvoiceNumber = invoiceNumber.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const now = (dependencies.now ?? (() => new Date()))();
  const idempotencyKey = `invoice-email:${invoice.id}:${(dependencies.id ?? randomUUID)()}`;
  let provider: CommunicationProvider;
  try {
    provider = dependencies.provider ?? selectCommunicationProvider();
  } catch (error) {
    console.error(JSON.stringify({
      event: "INVOICE_EMAIL_PROVIDER_FAILED",
      invoiceId,
      companyId,
      userId: createdByUserId,
      provider: process.env.EMAIL_PROVIDER?.trim() || "unconfigured",
      hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
      hasEmailFrom: Boolean(process.env.EMAIL_FROM),
      ...providerFailureDetails(error),
    }));
    throw error;
  }
  console.info(JSON.stringify({
    event: "INVOICE_EMAIL_PROVIDER_SELECTED",
    invoiceId,
    companyId,
    userId: createdByUserId,
    provider: provider.name ?? "custom",
    hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
    hasEmailFrom: Boolean(process.env.EMAIL_FROM),
  }));
  const tracedProvider: CommunicationProvider = {
    name: provider.name,
    async send(message, options) {
      console.info(JSON.stringify({
        event: "INVOICE_EMAIL_PROVIDER_CALL_STARTED",
        invoiceId,
        companyId,
        userId: createdByUserId,
        provider: provider.name ?? "custom",
      }));
      try {
        const result = await provider.send(message, options);
        console.info(JSON.stringify({
          event: "INVOICE_EMAIL_PROVIDER_ACCEPTED",
          invoiceId,
          companyId,
          userId: createdByUserId,
          provider: provider.name ?? "custom",
          providerStatus: result.providerStatus,
        }));
        return result;
      } catch (error) {
        console.error(JSON.stringify({
          event: "INVOICE_EMAIL_PROVIDER_FAILED",
          invoiceId,
          companyId,
          userId: createdByUserId,
          provider: provider.name ?? "custom",
          ...providerFailureDetails(error),
        }));
        throw error;
      }
    },
  };
  const delivery = await sendOrEnqueueCommunication(
    companyId,
    {
      channel: "email",
      to: recipient,
      subject,
      body,
      attachments: [
        {
          filename: `Invoice-${safeInvoiceNumber}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        },
      ],
      idempotencyKey,
      createdByUserId,
    },
    { workersEnabled: false, provider: tracedProvider },
  );
  if (delivery.mode !== "synchronous") {
    throw new AppError("PROVIDER_FAILED", "Invoice email was not accepted by the provider.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.invoice.update({
      where: { id: invoice.id, companyId },
      data: {
        status: invoice.status === "Draft" ? "Sent" : invoice.status,
        sentAt: now,
        lastSentTo: recipient,
      },
    });
    await recordEstimateEventInTransaction(tx, {
      companyId,
      estimateId: invoice.estimate.id,
      eventType: "Invoice Sent",
      category: "Invoice",
      actor: {
        type: "Employee",
        id: createdByUserId,
        userId: createdByUserId,
        displayName: "Team member",
      },
      summary: `Team member sent ${invoiceNumber} to ${recipient}.`,
      visibility: "Both",
      metadata: {
        invoiceId: invoice.id,
        to: recipient,
        providerMessageId: delivery.result.providerMessageId,
      },
      attachments: [
        {
          referenceType: "Invoice",
          referenceId: invoice.id,
          displayName: invoiceNumber,
        },
      ],
    });
    return row;
  });

  return {
    invoice: updated,
    providerMessageId: delivery.result.providerMessageId,
  };
}
