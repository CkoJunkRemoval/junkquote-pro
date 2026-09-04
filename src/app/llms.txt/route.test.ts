import { describe, expect, it } from "vitest";
import { isPublicAuthPath } from "@/auth.config";
import { GET } from "./route";

describe("llms.txt", () => {
  it("is public and returns the production resources as plain text", async () => {
    const response = GET();
    const body = await response.text();
    expect(isPublicAuthPath("/llms.txt")).toBe(true);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(body).toContain("Per-company pricing from $0 to $149/month.");
    for (const url of ["https://junkquoteprohq.com/", "https://junkquoteprohq.com/pricing", "https://junkquoteprohq.com/features", "https://junkquoteprohq.com/about"]) expect(body).toContain(url);
    expect(body).not.toMatch(/\/dashboard|\/customers|\/invoices|\/portal/);
  });
});
