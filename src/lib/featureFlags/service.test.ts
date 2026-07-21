import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { resolveFeatureFlag, rolloutBucket, validateRollout } from "./service";

const flag = (id: string, fields: Record<string, unknown> = {}) => ({
  id,
  companyId: null,
  plan: null,
  environment: null,
  enabled: true,
  rolloutPercent: 100,
  createdAt: new Date("2026-01-01"),
  ...fields,
});

describe("feature flags", () => {
  it("uses company, then plan, then environment, then default precedence", () => {
    const flags = [
      flag("default"),
      flag("environment", { environment: "production" }),
      flag("plan", { plan: "Professional" }),
      flag("company", { companyId: "company-1", enabled: false }),
    ];
    expect(resolveFeatureFlag(flags as never, { companyId: "company-1", plan: "Professional", environment: "production" })?.id).toBe("company");
    expect(resolveFeatureFlag(flags as never, { companyId: "company-2", plan: "Professional", environment: "production" })?.id).toBe("plan");
    expect(resolveFeatureFlag(flags as never, { companyId: "company-2", environment: "production" })?.id).toBe("environment");
    expect(resolveFeatureFlag(flags as never, { companyId: "company-2", environment: "preview" })?.id).toBe("default");
  });
  it("does not leak a company override to another tenant", () => {
    const flags = [flag("default"), flag("company", { companyId: "company-1" })];
    expect(resolveFeatureFlag(flags as never, { companyId: "company-2" })?.id).toBe("default");
  });
  it("buckets a subject deterministically", () => expect(rolloutBucket("flag", "subject")).toBe(rolloutBucket("flag", "subject")));
  it("validates rollout bounds", () => {
    expect(() => validateRollout(50)).not.toThrow();
    expect(() => validateRollout(101)).toThrow("0 to 100");
  });
});
