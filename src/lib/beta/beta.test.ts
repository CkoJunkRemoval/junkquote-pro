import { describe, expect, it } from "vitest";
import { evaluateDependencyPolicy } from "./dependencyPolicy";
import { evaluateBetaGate } from "./gate";
describe("beta policy", () => {
  it("accepts documented build-time advisories and blocks unknown runtime risk", () => {
    expect(
      evaluateDependencyPolicy({
        vulnerabilities: {
          postcss: { severity: "moderate" },
          next: { severity: "moderate" },
        },
      }).passed,
    ).toBe(true);
    expect(
      evaluateDependencyPolicy({
        vulnerabilities: { unknown: { severity: "high" } },
      }).passed,
    ).toBe(false);
  });
  it("fails closed when any gate check fails", () =>
    expect(
      evaluateBetaGate([
        { name: "email", passed: true },
        { name: "storage", passed: false },
      ]),
    ).toMatchObject({
      passed: false,
      failed: [{ name: "storage", passed: false }],
    }));
});
