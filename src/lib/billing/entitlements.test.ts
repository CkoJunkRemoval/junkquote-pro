import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ subscription: vi.fn(), usage: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { companySubscription: { findUnique: mocks.subscription }, estimateUsageEvent: { count: mocks.usage } } }));
import { BillingAccessError, canCreateEstimate, resolveEffectivePlan, utcMonthRange } from "./entitlements";
const base = { plan: "Starter" as const, status: "Incomplete" as const, trialEnd: null, trialPlan: "Professional" as const, trialStatus: null, gracePeriodEnd: null, currentPeriodEnd: null, lastSuccessfulPaymentAt: null };
describe("effective subscription plan", () => {
  const now = new Date("2026-01-31T12:00:00.000Z");
  it("grants Professional during an active internal trial", () => expect(resolveEffectivePlan({ ...base, trialStatus: "Active", trialEnd: new Date("2026-02-01T12:00:00Z") }, now)).toMatchObject({ plan: "Professional", reason: "trial" }));
  it("expires exactly at the end timestamp and falls back to Free", () => expect(resolveEffectivePlan({ ...base, trialStatus: "Active", trialEnd: now }, now)).toMatchObject({ plan: "Free", reason: "free" }));
  it("requires payment evidence before an active Stripe state grants paid access", () => expect(resolveEffectivePlan({ ...base, status: "Active" }, now).plan).toBe("Free"));
  it("paid access overrides a trial", () => expect(resolveEffectivePlan({ ...base, status: "Active", lastSuccessfulPaymentAt: new Date("2026-01-01"), trialStatus: "Active", trialEnd: new Date("2026-02-01") }, now)).toMatchObject({ plan: "Starter", reason: "paid" }));
  it("a converted trial cannot resume", () => expect(resolveEffectivePlan({ ...base, trialStatus: "Converted", trialEnd: new Date("2026-02-01") }, now).plan).toBe("Free"));
  it("uses deterministic UTC month boundaries", () => expect(utcMonthRange(now)).toEqual({ start: new Date("2026-01-01T00:00:00.000Z"), end: new Date("2026-02-01T00:00:00.000Z") }));
});
describe("Free estimate allowance", () => {
  beforeEach(() => { mocks.subscription.mockResolvedValue(null); mocks.usage.mockReset(); });
  it("allows the first six estimates and blocks the seventh", async () => { mocks.usage.mockResolvedValueOnce(5); await expect(canCreateEstimate("company-1", new Date("2026-01-15"))).resolves.toBe(true); mocks.usage.mockResolvedValueOnce(6); await expect(canCreateEstimate("company-1", new Date("2026-01-15"))).rejects.toMatchObject({ code: "PLAN_LIMIT" } satisfies Partial<BillingAccessError>); });
  it("counts only the current UTC month", async () => { mocks.usage.mockResolvedValue(0); await canCreateEstimate("company-1", new Date("2026-02-01T00:00:00Z")); expect(mocks.usage).toHaveBeenCalledWith({ where: { companyId: "company-1", createdAt: { gte: new Date("2026-02-01T00:00:00Z"), lt: new Date("2026-03-01T00:00:00Z") } } }); });
});
