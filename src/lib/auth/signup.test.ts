import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), hash: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("bcryptjs", () => ({ default: { hash: mocks.hash } }));

import { createCompanyOwner, validateSignupInput } from "./signup";

const valid = {
  companyName: "  Katie's Hauling  ",
  firstName: " Katie ",
  lastName: " Sommer ",
  email: " OWNER@Example.COM ",
  password: "correct horse battery staple",
  passwordConfirmation: "correct horse battery staple",
};

describe("self-service signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hash.mockResolvedValue("bcrypt-hash");
  });

  it("normalizes and validates signup fields", () => {
    expect(validateSignupInput(valid)).toMatchObject({
      companyName: "Katie's Hauling",
      firstName: "Katie",
      lastName: "Sommer",
      email: "owner@example.com",
    });
  });

  it("rejects password mismatch", () => {
    expect(() =>
      validateSignupInput({
        ...valid,
        passwordConfirmation: "not-the-password",
      }),
    ).toThrow("Passwords do not match.");
  });

  it.each([
    [{ ...valid, companyName: "" }, "Company name is required."],
    [{ ...valid, email: "invalid" }, "Enter a valid email address."],
    [
      { ...valid, password: "short", passwordConfirmation: "short" },
      "Password must be",
    ],
  ])("rejects invalid input", (input, message) => {
    expect(() => validateSignupInput(input)).toThrow(message);
  });

  it("creates only server-selected owner and active membership values", async () => {
    const tx = {
      company: { create: vi.fn().mockResolvedValue({ id: "company-1" }) },
      user: { create: vi.fn().mockResolvedValue({ id: "user-1" }) },
      companyMembership: {
        create: vi.fn().mockResolvedValue({ id: "membership-1" }),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));
    await expect(createCompanyOwner(valid)).resolves.toEqual({
      companyId: "company-1",
      userId: "user-1",
      membershipId: "membership-1",
    });
    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: "company-1",
        role: "OWNER",
        active: true,
        passwordHash: "bcrypt-hash",
      }),
    });
    expect(tx.companyMembership.create).toHaveBeenCalledWith({
      data: {
        companyId: "company-1",
        userId: "user-1",
        role: "Owner",
        status: "Active",
      },
    });
  });

  it("does not commit company or user state when membership creation fails", async () => {
    const persisted: string[] = [];
    mocks.transaction.mockImplementation(async (callback) => {
      const pending: string[] = [];
      const tx = {
        company: {
          create: vi.fn(
            async () => (pending.push("company"), { id: "company-1" }),
          ),
        },
        user: {
          create: vi.fn(async () => (pending.push("user"), { id: "user-1" })),
        },
        companyMembership: {
          create: vi.fn(async () => {
            throw new Error("membership failure");
          }),
        },
        auditEvent: { create: vi.fn() },
      };
      const result = await callback(tx);
      persisted.push(...pending);
      return result;
    });
    await expect(createCompanyOwner(valid)).rejects.toMatchObject({
      code: "DATABASE_FAILED",
    });
    expect(persisted).toEqual([]);
  });
});
