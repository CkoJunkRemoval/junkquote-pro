import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, clearRateLimits } from "./rateLimit";
describe("rate limiter", () => {
  beforeEach(clearRateLimits);
  it("allows only the configured count within a window", () => {
    expect(checkRateLimit("a", { limit: 2, windowMs: 1000 }, 0).allowed).toBe(
      true,
    );
    expect(checkRateLimit("a", { limit: 2, windowMs: 1000 }, 1).allowed).toBe(
      true,
    );
    expect(checkRateLimit("a", { limit: 2, windowMs: 1000 }, 2).allowed).toBe(
      false,
    );
  });
  it("resets after the window", () => {
    checkRateLimit("a", { limit: 1, windowMs: 10 }, 0);
    expect(checkRateLimit("a", { limit: 1, windowMs: 10 }, 11).allowed).toBe(
      true,
    );
  });
});
