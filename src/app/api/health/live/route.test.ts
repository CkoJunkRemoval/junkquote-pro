import { describe, expect, it } from "vitest";
import { GET } from "./route";
describe("liveness", () => {
  it("returns live with propagated request ID and no secrets", async () => {
    const r = GET(
      new Request("http://localhost/api/health/live", {
        headers: { "x-request-id": "health-request-123" },
      }),
    );
    expect(r.status).toBe(200);
    expect(r.headers.get("x-request-id")).toBe("health-request-123");
    expect(await r.json()).toMatchObject({ status: "live" });
  });
});
