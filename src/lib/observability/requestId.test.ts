import { describe, expect, it } from "vitest";
import { createRequestId } from "./requestId";
describe("request IDs", () => {
  it("accepts safe inbound IDs", () =>
    expect(createRequestId("client-request-123")).toBe("client-request-123"));
  it("replaces invalid IDs cryptographically", () => {
    const a = createRequestId("bad id");
    const b = createRequestId("bad id");
    expect(a).toMatch(/^[a-f0-9]{32}$/);
    expect(a).not.toBe(b);
  });
});
