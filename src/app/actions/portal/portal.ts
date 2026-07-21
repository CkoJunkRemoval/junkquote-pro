"use server";

import { cookies, headers } from "next/headers";
import { buildPublicEstimatePdf } from "@/data/output/buildPublicEstimatePdf";
import { renderEstimatePdf } from "@/data/output/renderEstimatePdf";
import { renderInvoicePdf } from "@/data/output/renderInvoicePdf";
import { renderPaymentReceiptPdf } from "@/data/output/renderPaymentReceiptPdf";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { getEstimatePdfData } from "@/lib/estimates/getEstimatePdfData";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
import { getPaymentReceiptData } from "@/lib/payments/listInvoicePayments";
import {
  createMagicLinkForAccess,
  requestPortalMagicLink,
  revokePortalAccess,
  upsertPortalAccess,
} from "@/lib/portal/access";
import { requireCustomerPortalContext } from "@/lib/portal/context";
import { PORTAL_COOKIE } from "@/lib/portal/tokens";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import { recordAuditEvent } from "@/lib/audit/audit";
import { currentRequestId } from "@/lib/audit/requestAudit";

async function origin() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
export async function requestPortalMagicLinkAction(email: string) {
  const h = await headers();
  const identity =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    email.trim().toLowerCase();
  if (
    !(await checkRateLimit(`portal-request:${identity}`, ratePolicies.portal)).allowed
  )
    return {
      message:
        "If portal access exists for that email, a sign-in link has been sent.",
    };
  return requestPortalMagicLink(email, await origin());
}
export async function enablePortalAccessAction(
  customerId: string,
  email: string,
) {
  const context = await requireCompanyRole(
    "Owner",
    "Admin",
    "Manager",
    "Office",
  );
  const result = await upsertPortalAccess(context.companyId, customerId, email);
  await recordAuditEvent({
    companyId: context.companyId,
    actingUserId: context.user.id,
    portalAccessId: result.id,
    eventType: "portal.access_enabled",
    entityType: "Customer",
    entityId: customerId,
    requestId: await currentRequestId(),
  });
  return result;
}
export async function sendPortalLinkAction(accessId: string) {
  const context = await requireCompanyRole(
    "Owner",
    "Admin",
    "Manager",
    "Office",
  );
  return createMagicLinkForAccess(
    context.companyId,
    accessId,
    await origin(),
    context.user.id,
  );
}
export async function revokePortalAccessAction(accessId: string) {
  const context = await requireCompanyRole(
    "Owner",
    "Admin",
    "Manager",
    "Office",
  );
  const [access] = await revokePortalAccess(context.companyId, accessId);
  await recordAuditEvent({
    companyId: context.companyId,
    actingUserId: context.user.id,
    portalAccessId: accessId,
    eventType: "portal.access_revoked",
    entityType: "CustomerPortalAccess",
    entityId: accessId,
    requestId: await currentRequestId(),
  });
  return access;
}
export async function portalLogoutAction() {
  (await cookies()).delete(PORTAL_COOKIE);
}
export async function downloadPortalEstimateAction(id: string) {
  const c = await requireCustomerPortalContext();
  if(!(await checkRateLimit(`portal-pdf:${c.portalAccess.id}`,ratePolicies.pdf)).allowed)throw new Error("Too many PDF requests. Try again later.");
  const owned = await prisma.estimate.findFirst({
    where: { id, companyId: c.companyId, customerId: c.customerId },
    select: { id: true },
  });
  if (!owned) throw new Error("Estimate not found.");
  return renderEstimatePdf(
    buildPublicEstimatePdf(await getEstimatePdfData(c.companyId, id)),
  );
}
export async function downloadPortalInvoiceAction(id: string) {
  const c = await requireCustomerPortalContext();
  if(!(await checkRateLimit(`portal-pdf:${c.portalAccess.id}`,ratePolicies.pdf)).allowed)throw new Error("Too many PDF requests. Try again later.");
  const owned = await prisma.invoice.findFirst({
    where: { id, companyId: c.companyId, customerId: c.customerId },
    select: { id: true },
  });
  if (!owned) throw new Error("Invoice not found.");
  const invoice = await getInvoiceDetail(c.companyId, id);
  if (!invoice) throw new Error("Invoice not found.");
  return renderInvoicePdf(invoice);
}
export async function downloadPortalReceiptAction(id: string) {
  const c = await requireCustomerPortalContext();
  if(!(await checkRateLimit(`portal-pdf:${c.portalAccess.id}`,ratePolicies.pdf)).allowed)throw new Error("Too many PDF requests. Try again later.");
  const owned = await prisma.payment.findFirst({
    where: {
      id,
      companyId: c.companyId,
      invoice: { companyId: c.companyId, customerId: c.customerId },
    },
    select: { id: true },
  });
  if (!owned) throw new Error("Payment not found.");
  const payment = await getPaymentReceiptData(c.companyId, id);
  if (!payment) throw new Error("Payment not found.");
  return renderPaymentReceiptPdf(payment);
}
