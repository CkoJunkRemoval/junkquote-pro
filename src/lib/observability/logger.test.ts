import { describe, expect, it, vi } from "vitest";
import { log, redactLogData } from "./logger";
describe("structured logging", () => {
  it("recursively redacts secrets and sensitive payment fields", () =>
    expect(
      redactLogData({
        token: "raw",
        nested: { password: "pw", authorization: "bearer", safe: "ok" },
        cardNumber: "4111",
      }),
    ).toEqual({
      token: "[REDACTED]",
      nested: {
        password: "[REDACTED]",
        authorization: "[REDACTED]",
        safe: "ok",
      },
      cardNumber: "[REDACTED]",
    }));
  it("emits structured production JSON", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    log("info", "test.event", { requestId: "req-12345678" });
    expect(() => JSON.parse(String(spy.mock.calls[0][0]))).not.toThrow();
    spy.mockRestore();
    vi.unstubAllEnvs();
  });
});
