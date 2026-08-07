"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireCustomerPortalContext } from "@/lib/portal/context";
import { createConnectedInvoiceCheckout } from "@/lib/payments/connectedCheckout";

async function origin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const value = configured ? new URL(configured) : host ? new URL(`${h.get("x-forwarded-proto") === "http" ? "http" : "https"}://${host}`) : null;
  if (!value) throw new Error("Application URL is not configured.");
  if (process.env.NODE_ENV === "production" && value.protocol !== "https:") throw new Error("Online payments require HTTPS in production.");
  return value.origin;
}

export async function payPortalInvoiceAction(invoiceId: string) {
  const context = await requireCustomerPortalContext();
  const checkout = await createConnectedInvoiceCheckout({ companyId: context.companyId, customerId: context.customerId, invoiceId, origin: await origin() });
  redirect(checkout.url);
}
