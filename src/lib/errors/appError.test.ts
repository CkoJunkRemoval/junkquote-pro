import { describe, expect, it } from "vitest";
import { AppError, safeErrorResponse } from "./appError";
describe("application errors", () => {
  it("maps stable codes and request IDs", async () => {
    const r = safeErrorResponse(
      new AppError("CONFLICT", "Already changed."),
      "request-123",
    );
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({
      error: { code: "CONFLICT", message: "Already changed." },
      requestId: "request-123",
    });
  });
  it("hides unknown diagnostics", async () => {
    const r = safeErrorResponse(
      new Error("database password leaked"),
      "request-123",
    );
    expect(JSON.stringify(await r.json())).not.toContain("password");
  });
});
