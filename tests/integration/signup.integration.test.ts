import bcrypt from "bcryptjs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createCompanyOwner } from "@/lib/auth/signup";
import { prisma } from "@/lib/prisma";
import { resetIntegrationDatabase } from "./fixtures";

const input = {
  companyName: "  New Hauling Co  ",
  firstName: "New",
  lastName: "Owner",
  email: " NEW-OWNER@TEST.INVALID ",
  password: "a secure signup password",
  passwordConfirmation: "a secure signup password",
};

describe("self-service signup real database", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(resetIntegrationDatabase);

  it("atomically creates an active company owner and membership", async () => {
    const created = await createCompanyOwner(input);
    const user = await prisma.user.findUnique({
      where: { id: created.userId },
      include: { company: true, memberships: true },
    });
    expect(user).toMatchObject({
      companyId: created.companyId,
      email: "new-owner@test.invalid",
      role: "OWNER",
      active: true,
      company: { name: "New Hauling Co", active: true },
      memberships: [
        { companyId: created.companyId, role: "Owner", status: "Active" },
      ],
    });
    expect(user?.passwordHash).not.toBe(input.password);
    expect(await bcrypt.compare(input.password, user!.passwordHash)).toBe(true);
  });

  it("rejects a duplicate normalized email without leaving another company", async () => {
    await createCompanyOwner(input);
    await expect(
      createCompanyOwner({
        ...input,
        companyName: "Other Tenant",
        email: "new-owner@test.invalid",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await prisma.company.count()).toBe(1);
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.companyMembership.count()).toBe(1);
  });

  it("creates isolated tenant ownership with no cross-company membership", async () => {
    const first = await createCompanyOwner(input);
    const second = await createCompanyOwner({
      ...input,
      companyName: "Second Hauling Co",
      email: "second-owner@test.invalid",
    });
    expect(first.companyId).not.toBe(second.companyId);
    expect(
      await prisma.companyMembership.count({
        where: { userId: first.userId, companyId: second.companyId },
      }),
    ).toBe(0);
    expect(
      await prisma.companyMembership.count({
        where: { userId: second.userId, companyId: first.companyId },
      }),
    ).toBe(0);
  });
});
