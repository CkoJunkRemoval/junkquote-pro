import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCompanyOwner: vi.fn(),
  redirect: vi.fn(),
  checkRateLimit: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "192.0.2.10" })),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/signup", () => ({ createCompanyOwner: mocks.createCompanyOwner }));
vi.mock("@/lib/security/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  ratePolicies: { signUp: { limit: 5, windowMs: 60_000 } },
}));

import { AppError } from "@/lib/errors/appError";
import { signUpAction } from "./signUp";

function form() {
  const data = new FormData();
  data.set("companyName", "Example Hauling");
  data.set("firstName", "Test");
  data.set("lastName", "Owner");
  data.set("email", " OWNER@EXAMPLE.COM ");
  data.set("password", "correct horse battery staple");
  data.set("passwordConfirmation", "correct horse battery staple");
  return data;
}

describe("signup action result contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.checkRateLimit.mockReturnValue({ allowed: true });
    mocks.createCompanyOwner.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
      membershipId: "membership-1",
    });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("invokes account creation and redirects instead of returning failure", async () => {
    await expect(signUpAction({ error: null }, form())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.createCompanyOwner).toHaveBeenCalledWith(
      expect.objectContaining({ email: " OWNER@EXAMPLE.COM " }),
    );
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-in?created=1");
  });

  it("returns the service's generic database failure in the expected error field", async () => {
    mocks.createCompanyOwner.mockRejectedValue(
      new AppError(
        "DATABASE_FAILED",
        "Account creation could not be completed. Please try again.",
      ),
    );
    await expect(signUpAction({ error: null }, form())).resolves.toEqual({
      error: "Account creation could not be completed. Please try again.",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
