import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  default: () => ({ auth: (handler: unknown) => handler }),
}));

import middleware from "./middleware";

function request(path: string, authenticated = false, portal = false) {
  const url = new URL(`http://localhost:3000${path}`);
  return {
    auth: authenticated ? { user: { id: "user-a" } } : null,
    headers: new Headers(),
    cookies: { has: (name: string) => portal && name === "jq_portal_session" },
    nextUrl: Object.assign(url, { clone: () => new URL(url) }),
  };
}

async function run(path: string, authenticated = false, portal = false) {
  const response = await middleware(
    request(path, authenticated, portal) as never,
    {} as never,
  );
  if (!response) throw new Error("Expected middleware response");
  return response;
}

describe("staff route authentication middleware", () => {
  it("redirects an unauthenticated dashboard request to sign-in", async () => {
    const response = await run("/dashboard");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/sign-in?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fdashboard",
    );
  });

  it("allows an authenticated user to continue to the dashboard", async () => {
    const response = await run("/dashboard", true);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("keeps authenticated authorization in the page boundary", async () => {
    const response = await run("/dashboard", true);

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("handles ordinary signed-out access before a page AuthorizationError", async () => {
    const response = await run("/team");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/sign-in?");
    expect(response.headers.get("x-middleware-next")).not.toBe("1");
  });

  it("preserves the controlled portal-session denial", async () => {
    const response = await run("/dashboard", false, true);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:3000/access-denied",
    );
  });
});
