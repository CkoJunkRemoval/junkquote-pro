import { describe, expect, it } from "vitest";
import { belongsToScope, OFFLINE_STORES } from "./store";

describe("offline field store policy", () => {
  it("creates every required durable store", () => {
    expect(OFFLINE_STORES).toEqual([
      "packages", "mutations", "media", "signatures", "syncResults", "conflicts", "metadata",
    ]);
  });

  it("isolates records by both company and user", () => {
    expect(belongsToScope({ companyId: "a", userId: "u" }, { companyId: "a", userId: "u" })).toBe(true);
    expect(belongsToScope({ companyId: "b", userId: "u" }, { companyId: "a", userId: "u" })).toBe(false);
    expect(belongsToScope({ companyId: "a", userId: "v" }, { companyId: "a", userId: "u" })).toBe(false);
  });
});
