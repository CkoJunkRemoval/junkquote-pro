import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { redactTelemetry } from "./systemErrors";

describe("system error redaction", () => {
  it("redacts credentials, authorization, and token values", () => {
    const value = redactTelemetry({ authorization: "Bearer private", detail: "password=hunter2", nested: { apiKey: "secret" } });
    const output = JSON.stringify(value);
    expect(output).not.toContain("private");
    expect(output).not.toContain("hunter2");
    expect(output).not.toContain("secret");
  });
});
