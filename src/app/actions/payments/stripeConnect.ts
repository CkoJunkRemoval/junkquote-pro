"use server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdminTenant } from "@/lib/auth/tenant";
import {
  BillingUnavailableError,
  getStripeConnect,
} from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";
import { retrieveAndSyncConnectedAccount } from "@/lib/payments/stripeConnect";

async function origin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const value = configured
    ? new URL(configured)
    : host
      ? new URL(
          `${h.get("x-forwarded-proto") === "http" ? "http" : "https"}://${host}`,
        )
      : null;
  if (!value) throw new Error("Application URL is not configured.");
  if (process.env.NODE_ENV === "production" && value.protocol !== "https:")
    throw new Error("Stripe Connect requires HTTPS in production.");
  return value.origin;
}
async function accountLink(account: string) {
  const base = await origin();
  return getStripeConnect().accountLinks.create({
    account,
    type: "account_onboarding",
    refresh_url: `${base}/settings/payments/connect/refresh`,
    return_url: `${base}/settings/payments/connect/return`,
    collection_options: { fields: "eventually_due" },
  });
}

function connectFailure(error: unknown) {
  if (error instanceof BillingUnavailableError)
    return {
      category: "configuration",
      statusCode: null,
      stripeType: null,
      stripeCode: null,
    };
  if (error instanceof Stripe.errors.StripeError)
    return {
      category: "stripe",
      statusCode: error.statusCode ?? null,
      stripeType: error.type ?? null,
      stripeCode: error.code ?? null,
    };
  return null;
}

async function handleConnectFailure(
  error: unknown,
  companyId: string,
  userId: string,
  stage: "account" | "account_link",
): Promise<never> {
  const failure = connectFailure(error);
  if (!failure) throw error;
  console.error("[payments] Stripe Connect onboarding failed", {
    companyId,
    userId,
    stage,
    ...failure,
  });
  try {
    await prisma.auditEvent.create({
      data: {
        companyId,
        actingUserId: userId,
        eventType: "payments.stripe_connect_failed",
        entityType: "Company",
        entityId: companyId,
        metadata: { stage, ...failure },
      },
    });
  } catch {
    console.error(
      "[payments] Stripe Connect failure audit could not be persisted",
      { companyId, stage, category: failure.category },
    );
  }
  redirect("/settings/payments?connectError=1");
}

export async function startStripeConnectAction() {
  const c = await requireAdminTenant();
  let company = await prisma.company.findUniqueOrThrow({
    where: { id: c.companyId },
  });
  let accountId = company.stripeConnectedAccountId;
  if (!accountId) {
    let account;
    try {
      account = await getStripeConnect().accounts.create(
        {
          country: "US",
          email: company.email ?? c.user.email,
          business_profile: {
            name: company.displayName || company.name,
            url: company.website ?? undefined,
            support_phone: company.phone ?? undefined,
          },
          controller: {
            fees: { payer: "account" },
            losses: { payments: "stripe" },
            requirement_collection: "stripe",
            stripe_dashboard: { type: "full" },
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: { companyId: company.id },
        },
        { idempotencyKey: `connect-company-${company.id}` },
      );
    } catch (error) {
      return handleConnectFailure(error, company.id, c.user.id, "account");
    }
    accountId = account.id;
    company = await prisma.company.update({
      where: { id: company.id },
      data: {
        stripeConnectedAccountId: accountId,
        stripeConnectStatus: "ONBOARDING",
        stripeConnectUpdatedAt: new Date(),
      },
    });
    await prisma.auditEvent.create({
      data: {
        companyId: company.id,
        actingUserId: c.user.id,
        eventType: "payments.stripe_connect_created",
        entityType: "Company",
        entityId: company.id,
      },
    });
  } else if (company.stripeConnectDisconnectedAt) {
    company = await prisma.company.update({
      where: { id: company.id },
      data: {
        stripeConnectDisconnectedAt: null,
        stripeConnectStatus: "ONBOARDING",
        stripeConnectUpdatedAt: new Date(),
      },
    });
    await prisma.auditEvent.create({
      data: {
        companyId: company.id,
        actingUserId: c.user.id,
        eventType: "payments.stripe_connect_reconnected",
        entityType: "Company",
        entityId: company.id,
      },
    });
  }
  let link;
  try {
    link = await accountLink(accountId);
  } catch (error) {
    return handleConnectFailure(error, company.id, c.user.id, "account_link");
  }
  redirect(link.url);
}
export async function refreshStripeConnectAction() {
  const c = await requireAdminTenant();
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: c.companyId },
  });
  if (!company.stripeConnectedAccountId) redirect("/settings/payments");
  let link;
  try {
    link = await accountLink(company.stripeConnectedAccountId);
  } catch (error) {
    return handleConnectFailure(error, company.id, c.user.id, "account_link");
  }
  redirect(link.url);
}
export async function returnFromStripeConnectAction() {
  const c = await requireAdminTenant();
  await retrieveAndSyncConnectedAccount(c.companyId);
  redirect("/settings/payments?returned=1");
}
export async function disconnectStripeConnectAction() {
  const c = await requireAdminTenant();
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: c.companyId },
  });
  if (!company.stripeConnectedAccountId)
    throw new Error("Stripe is not connected.");
  await prisma.$transaction([
    prisma.company.update({
      where: { id: company.id },
      data: {
        stripeConnectDisconnectedAt: new Date(),
        stripeConnectStatus: "RESTRICTED",
      },
    }),
    prisma.auditEvent.create({
      data: {
        companyId: company.id,
        actingUserId: c.user.id,
        eventType: "payments.stripe_connect_disconnected",
        entityType: "Company",
        entityId: company.id,
      },
    }),
  ]);
  redirect("/settings/payments?disconnected=1");
}
