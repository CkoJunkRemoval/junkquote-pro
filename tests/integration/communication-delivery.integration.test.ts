import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prisma } from "@/lib/prisma";
import {
  beginDelivery,
  markDeliveryFailed,
  markDeliverySent,
  applyDeliveryWebhook,
} from "@/lib/communications/delivery";
import { recordAuditEvent } from "@/lib/audit/audit";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";
describe("communication delivery real database", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(resetIntegrationDatabase);
  it("persists delivery transitions without recipient data", async () => {
    const { a } = await createTenantFixtures();
    const delivery = await beginDelivery({
      companyId: a.company.id,
      idempotencyKey: "mail-1",
      provider: "resend",
      message: {
        channel: "email",
        to: "private@example.com",
        body: "private body",
      },
      requestId: "request-12345678",
    });
    expect(delivery.status).toBe("Pending");
    await markDeliverySent(delivery.id, "provider-1");
    expect(
      await prisma.communicationDelivery.findUnique({
        where: { id: delivery.id },
      }),
    ).toMatchObject({ status: "Sent", providerMessageId: "provider-1" });
    expect(
      JSON.stringify(
        await prisma.communicationDelivery.findUnique({
          where: { id: delivery.id },
        }),
      ),
    ).not.toContain("private@example.com");
  });
  it("processes webhook states idempotently and derives tenant from provider message", async () => {
    const { a } = await createTenantFixtures();
    const delivery = await beginDelivery({
      companyId: a.company.id,
      idempotencyKey: "mail-1",
      provider: "resend",
      message: { channel: "email", to: "a@example.com", body: "body" },
    });
    await markDeliverySent(delivery.id, "provider-1");
    const first = await applyDeliveryWebhook({
      providerEventId: "event-1",
      eventType: "email.delivered",
      providerMessageId: "provider-1",
      occurredAt: new Date(),
    });
    const second = await applyDeliveryWebhook({
      providerEventId: "event-1",
      eventType: "email.delivered",
      providerMessageId: "provider-1",
      occurredAt: new Date(),
    });
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(
      await prisma.providerWebhookEvent.count({
        where: { providerEventId: "event-1" },
      }),
    ).toBe(1);
    expect(
      await prisma.communicationDelivery.findUnique({
        where: { id: delivery.id },
      }),
    ).toMatchObject({ companyId: a.company.id, status: "Delivered" });
  });
  it("records safe diagnostic audit and failed delivery state", async () => {
    const { a } = await createTenantFixtures();
    const delivery = await beginDelivery({
      companyId: a.company.id,
      idempotencyKey: "diagnostic-1",
      provider: "resend",
      message: { channel: "email", to: "test@example.com", body: "test" },
    });
    await markDeliveryFailed(delivery.id, {
      code: "PROVIDER_FAILED",
      message: "secret body",
    });
    await recordAuditEvent({
      companyId: a.company.id,
      actingUserId: a.user.id,
      eventType: "email.diagnostic_failed",
      entityType: "CommunicationDelivery",
      entityId: delivery.id,
    });
    expect(
      await prisma.communicationDelivery.findUnique({
        where: { id: delivery.id },
      }),
    ).toMatchObject({ status: "Failed", lastErrorCode: "PROVIDER_FAILED" });
    expect(
      await prisma.auditEvent.count({
        where: {
          companyId: a.company.id,
          eventType: "email.diagnostic_failed",
        },
      }),
    ).toBe(1);
  });
  it("confirms release-gate schema checks exist", async () => {
    const rows = await prisma.$queryRaw<
      Array<{ table_name: string }>
    >`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('communication_deliveries','provider_webhook_events')`;
    expect(rows.map((x) => x.table_name).sort()).toEqual([
      "communication_deliveries",
      "provider_webhook_events",
    ]);
  });
});
