import { describe, expect, it, vi } from "vitest";
import { retryTransientCleanup } from "./cleanup";

describe("integration cleanup retries", () => {
  it("retries a transient database connection failure", async () => {
    const work = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce({ code: "P1001" })
      .mockResolvedValue(undefined);
    await retryTransientCleanup(work);
    expect(work).toHaveBeenCalledTimes(2);
  });

  it("does not retry assertions or persistent access errors", async () => {
    for (const error of [new Error("assertion failed"), { code: "EACCES" }]) {
      const work = vi.fn<() => Promise<void>>().mockRejectedValue(error);
      await expect(retryTransientCleanup(work)).rejects.toBe(error);
      expect(work).toHaveBeenCalledTimes(1);
    }
  });
});
