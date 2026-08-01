import { describe, expect, it } from "vitest";
import { billingFeatureLabel, billingStatusLabel } from "./presentation";

const subscription = {
  status: "Incomplete" as const,
  trialStatus: "Active" as const,
  trialEnd: new Date("2030-02-01T00:00:00Z"),
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  cancelAtPeriodEnd: false,
};

describe("billing presentation", () => {
  it("labels an active internal trial without Stripe objects as Trial active", () => {
    expect(billingStatusLabel(subscription, "trial", new Date("2030-01-01T00:00:00Z"))).toBe("Trial active");
  });

  it("reserves Incomplete for a real Stripe subscription", () => {
    expect(billingStatusLabel({ ...subscription, trialStatus: "Converted", stripeCustomerId: "cus_test", stripeSubscriptionId: "sub_test" }, "free")).toBe("Incomplete");
  });

  it("humanizes required lifecycle labels", () => {
    expect(billingStatusLabel({ ...subscription, status: "Active", trialStatus: "Converted", stripeSubscriptionId: "sub_test" }, "paid")).toBe("Active");
    expect(billingStatusLabel({ ...subscription, status: "PastDue", trialStatus: "Converted", stripeSubscriptionId: "sub_test" }, "grace")).toBe("Past due");
    expect(billingStatusLabel({ ...subscription, status: "Active", trialStatus: "Converted", stripeSubscriptionId: "sub_test", cancelAtPeriodEnd: true }, "paid")).toBe("Cancellation scheduled");
    expect(billingStatusLabel({ ...subscription, status: "Canceled", trialStatus: "Converted", stripeSubscriptionId: "sub_test" }, "free")).toBe("Canceled");
    expect(billingStatusLabel({ ...subscription, trialStatus: "Expired", trialEnd: new Date("2029-01-01T00:00:00Z") }, "free", new Date("2030-01-01T00:00:00Z"))).toBe("Free");
  });

  it("uses centralized human-readable feature labels", () => {
    expect(billingFeatureLabel("pdfEstimates")).toBe("PDF estimates");
    expect(billingFeatureLabel("pricingIntelligence")).toBe("Pricing Intelligence");
    expect(billingFeatureLabel("advancedExports")).toBe("Advanced exports");
    expect(billingFeatureLabel("timekeeping")).toBe("Timekeeping");
    expect(billingFeatureLabel("approvals")).toBe("Customer approvals");
  });
});
