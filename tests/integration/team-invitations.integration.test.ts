import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetIntegrationDatabase } from "./fixtures";

const mail = vi.hoisted(() => ({ send: vi.fn().mockResolvedValue({ providerMessageId: "provider-message" }) }));
vi.mock("@/lib/communications/provider", () => ({ selectCommunicationProvider: () => mail }));

import {
  acceptTeamInvitation,
  createTeamInvitation,
  generateInvitationToken,
  hashInvitationToken,
  resendTeamInvitation,
  revokeTeamInvitation,
  validateTeamInvitation,
} from "@/lib/teamInvitations/service";

async function tenant(label: string) {
  const company = await prisma.company.create({ data: { name: label, displayName: label } });
  const owner = await prisma.user.create({ data: { companyId: company.id, email: `owner-${label}@test.invalid`, passwordHash: "test", role: "OWNER" } });
  await prisma.companyMembership.create({ data: { companyId: company.id, userId: owner.id, role: "Owner" } });
  return { company, owner };
}

function deliveredToken() {
  const body = mail.send.mock.calls.at(-1)?.[0].body as string;
  return new URL(body.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;
}

describe("team invitation lifecycle", () => {
  beforeEach(async () => {
    await resetIntegrationDatabase();
    vi.clearAllMocks();
    mail.send.mockResolvedValue({ providerMessageId: "provider-message" });
    process.env.NEXT_PUBLIC_APP_URL = "https://app.test.invalid";
  });

  it("creates a tenant-owned hashed invitation and delivers the link without persisting the token", async () => {
    const a = await tenant("invite-create");
    const result = await createTeamInvitation({ companyId: a.company.id, actingUserId: a.owner.id, actorRole: "Owner", firstName: "Alex", lastName: "Crew", email: " ALEX@example.com ", role: "Crew" });
    const token = deliveredToken();
    const row = await prisma.teamInvitation.findUniqueOrThrow({ where: { id: result.id } });
    expect(row.companyId).toBe(a.company.id);
    expect(row.email).toBe("alex@example.com");
    expect(row.tokenHash).toBe(hashInvitationToken(token));
    expect(JSON.stringify(row)).not.toContain(token);
    expect(mail.send).toHaveBeenCalledOnce();
    expect(await prisma.auditEvent.count({ where: { companyId: a.company.id, eventType: "team.invitation_created" } })).toBe(1);
  });

  it("accepts a new user once, assigns the requested role, links workforce, and blocks replay", async () => {
    const a = await tenant("new-user");
    await createTeamInvitation({ companyId: a.company.id, actingUserId: a.owner.id, actorRole: "Owner", firstName: "Nia", lastName: "Office", email: "nia@example.com", role: "Office" });
    const token = deliveredToken();
    const accepted = await acceptTeamInvitation({ token, firstName: "Nia", lastName: "Office", password: "correct horse battery", passwordConfirmation: "correct horse battery" });
    const membership = await prisma.companyMembership.findUniqueOrThrow({ where: { userId_companyId: { userId: accepted.userId, companyId: a.company.id } } });
    const employee = await prisma.employee.findFirstOrThrow({ where: { companyId: a.company.id, userId: accepted.userId } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: accepted.userId } });
    expect(membership.role).toBe("Office");
    expect(employee.invitationStatus).toBe("Accepted");
    expect(await bcrypt.compare("correct horse battery", user.passwordHash)).toBe(true);
    await expect(acceptTeamInvitation({ token, authenticatedUserId: user.id })).rejects.toThrow();
    expect(await prisma.companyMembership.count({ where: { userId: user.id, companyId: a.company.id } })).toBe(1);
  });

  it("links an authenticated existing identity without creating a duplicate user", async () => {
    const [a, b] = await Promise.all([tenant("existing-target"), tenant("existing-home")]);
    const existing = await prisma.user.create({ data: { companyId: b.company.id, email: "existing@example.com", passwordHash: "existing-hash", role: "CREW_MEMBER" } });
    await prisma.companyMembership.create({ data: { companyId: b.company.id, userId: existing.id, role: "Crew" } });
    await createTeamInvitation({ companyId: a.company.id, actingUserId: a.owner.id, actorRole: "Owner", firstName: "Existing", lastName: "User", email: existing.email, role: "Manager" });
    const token = deliveredToken();
    await expect(acceptTeamInvitation({ token })).rejects.toThrow("Sign in");
    await acceptTeamInvitation({ token, authenticatedUserId: existing.id });
    expect(await prisma.user.count({ where: { email: existing.email } })).toBe(1);
    expect((await prisma.companyMembership.findUniqueOrThrow({ where: { userId_companyId: { userId: existing.id, companyId: a.company.id } } })).role).toBe("Manager");
    expect(await prisma.employee.findFirst({ where: { companyId: a.company.id, userId: existing.id } })).toBeTruthy();
  });

  it("enforces tenant-scoped revoke/resend and invalidates old and revoked tokens", async () => {
    const [a, b] = await Promise.all([tenant("tenant-a"), tenant("tenant-b")]);
    const created = await createTeamInvitation({ companyId: a.company.id, actingUserId: a.owner.id, actorRole: "Owner", firstName: "T", lastName: "A", email: "scope@example.com", role: "Crew" });
    const oldToken = deliveredToken();
    await expect(revokeTeamInvitation(b.company.id, b.owner.id, created.id)).rejects.toThrow();
    await resendTeamInvitation(a.company.id, a.owner.id, "Owner", created.id);
    const newToken = deliveredToken();
    expect((await validateTeamInvitation(oldToken)).state).toBe("invalid");
    expect((await validateTeamInvitation(newToken)).state).toBe("valid");
    await revokeTeamInvitation(a.company.id, a.owner.id, created.id);
    expect((await validateTeamInvitation(newToken)).state).toBe("revoked");
    await expect(acceptTeamInvitation({ token: newToken, firstName: "T", lastName: "A", password: "correct horse battery", passwordConfirmation: "correct horse battery" })).rejects.toThrow();
  });

  it("expires stale invitations and rejects invalid tokens without disclosing an account", async () => {
    const a = await tenant("expiry");
    const token = generateInvitationToken();
    const employee = await prisma.employee.create({ data: { companyId: a.company.id, firstName: "Old", lastName: "Invite", email: "old@example.com", role: "CrewMember" } });
    await prisma.teamInvitation.create({ data: { companyId: a.company.id, employeeId: employee.id, email: employee.email!, role: "Crew", tokenHash: hashInvitationToken(token), status: "Pending", expiresAt: new Date(Date.now() - 1_000), createdByUserId: a.owner.id } });
    expect((await validateTeamInvitation(token)).state).toBe("expired");
    expect((await validateTeamInvitation("not-a-real-token")).state).toBe("invalid");
    await expect(acceptTeamInvitation({ token, firstName: "Old", lastName: "Invite", password: "correct horse battery", passwordConfirmation: "correct horse battery" })).rejects.toThrow();
  });
});
