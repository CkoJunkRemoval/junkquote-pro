import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { recordAuditEvent, listAuditEvents } from "@/lib/audit/audit";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";
describe("audit log real database", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(resetIntegrationDatabase);
  it("appends sanitized tenant events and filters them", async () => {
    const { a } = await createTenantFixtures();
    await recordAuditEvent({
      companyId: a.company.id,
      actingUserId: a.user.id,
      eventType: "payment.created",
      entityType: "Payment",
      entityId: a.payment.id,
      requestId: "request-12345678",
      metadata: { amount: 25, token: "never-store" },
    });
    const result = await listAuditEvents(a.company.id, {
      eventType: "payment.created",
      requestId: "request-12345678",
    });
    expect(result.total).toBe(1);
    expect(result.events[0].metadata).toEqual({
      amount: 25,
      token: "[REDACTED]",
    });
  });
  it("isolates tenants and paginates append-only events", async () => {
    const { a, b } = await createTenantFixtures();
    for (let i = 0; i < 30; i++)
      await recordAuditEvent({
        companyId: a.company.id,
        eventType: "test.event",
        entityId: String(i),
      });
    await recordAuditEvent({
      companyId: b.company.id,
      eventType: "other.event",
    });
    const page = await listAuditEvents(a.company.id, { page: 2, pageSize: 10 });
    expect(page.total).toBe(30);
    expect(page.events).toHaveLength(10);
    expect(page.events.every((e) => e.companyId === a.company.id)).toBe(true);
  });
});
