import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { hasQualifyingPaidSubscription, requiredReason } from "./platformCompanyManagement";

describe("platform company management safety", () => {
  it("requires a meaningful reason", () => { expect(() => requiredReason(" ")).toThrow("reason"); expect(requiredReason("Support resolution")).toBe("Support resolution"); });
  it("blocks trial overrides only when authoritative paid evidence exists", () => {
    expect(hasQualifyingPaidSubscription({stripeSubscriptionId:"sub_live",status:"Active",lastSuccessfulPaymentAt:new Date()})).toBe(true);
    expect(hasQualifyingPaidSubscription({stripeSubscriptionId:"sub_live",status:"Active",lastSuccessfulPaymentAt:null})).toBe(false);
    expect(hasQualifyingPaidSubscription({stripeSubscriptionId:null,status:"Active",lastSuccessfulPaymentAt:new Date()})).toBe(false);
  });
});
