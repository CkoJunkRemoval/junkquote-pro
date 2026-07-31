import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { catalogEntryForPriceId } from "./config";
import { validateCheckoutSelection } from "./stripe";
beforeEach(() => { vi.stubEnv("STRIPE_PRICE_STARTER_MONTHLY", "price_sm"); vi.stubEnv("STRIPE_PRICE_STARTER_YEARLY", "price_sy"); vi.stubEnv("STRIPE_PRICE_PROFESSIONAL_MONTHLY", "price_pm"); vi.stubEnv("STRIPE_PRICE_PROFESSIONAL_YEARLY", "price_py"); vi.stubEnv("STRIPE_PRICE_ENTERPRISE_MONTHLY", "price_em"); vi.stubEnv("STRIPE_PRICE_ENTERPRISE_YEARLY", "price_ey"); });
describe("Stripe billing catalog", () => {
  it("maps all annual and monthly server prices", () => { expect(catalogEntryForPriceId("price_sm")).toEqual({ plan: "Starter", interval: "Monthly" }); expect(catalogEntryForPriceId("price_py")).toEqual({ plan: "Professional", interval: "Yearly" }); expect(catalogEntryForPriceId("price_ey")).toEqual({ plan: "Enterprise", interval: "Yearly" }); });
  it("rejects arbitrary plans, intervals, and client price IDs", () => { expect(() => validateCheckoutSelection("Free", "Monthly")).toThrow(); expect(() => validateCheckoutSelection("Professional", "price_attacker")).toThrow(); expect(catalogEntryForPriceId("price_attacker")).toBeNull(); });
  it("rejects invalid webhook signatures", () => expect(() => new Stripe("sk_test_example").webhooks.constructEvent("{}", "bad", "whsec_test")).toThrow());
});
