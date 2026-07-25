import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import type { MembershipRole, UserRole, EmployeeRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { selectCommunicationProvider } from "@/lib/communications/provider";
import { createNotification } from "@/lib/notifications/service";
import { signupPasswordMinimum } from "@/lib/auth/signup";

export const invitationLifetimeMs = 7 * 24 * 60 * 60_000;
export const genericInvitationError = "This invitation link is invalid or no longer available.";
const allowedRoles: MembershipRole[] = ["Admin", "Manager", "Office", "Crew"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const hashInvitationToken = (value: string) => createHash("sha256").update(value).digest("hex");
export const generateInvitationToken = () => randomBytes(32).toString("base64url");
const userRole = (role: MembershipRole): UserRole =>
  ({ Owner: "OWNER", Admin: "MANAGER", Manager: "MANAGER", Office: "OFFICE", Crew: "CREW_MEMBER" })[role] as UserRole;
const employeeRole = (role: MembershipRole): EmployeeRole =>
  ({ Owner: "Owner", Admin: "Manager", Manager: "Manager", Office: "Office", Crew: "CrewMember" })[role] as EmployeeRole;

function validateRole(actorRole: MembershipRole, role: MembershipRole) {
  if (!allowedRoles.includes(role) || (role === "Admin" && actorRole !== "Owner"))
    throw new Error("You cannot grant that company role.");
}

async function sendInviteEmail(input: { id: string; email: string; companyName: string; token: string; reminder: boolean }) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL is required to send team invitations.");
  await selectCommunicationProvider().send({
    channel: input.reminder ? "reminder" : "email",
    to: input.email,
    subject: input.reminder ? `Reminder: join ${input.companyName}` : `You're invited to ${input.companyName}`,
    body: `${input.reminder ? "Reminder: " : ""}Join ${input.companyName} in JunkQuote Pro. This single-use link expires in 7 days: ${base}/join?token=${encodeURIComponent(input.token)}`,
  }, { idempotencyKey: `team-invitation:${input.id}:${hashInvitationToken(input.token).slice(0, 12)}` });
}

export async function createTeamInvitation(input: {
  companyId: string; actingUserId: string; actorRole: MembershipRole;
  firstName: string; lastName: string; email: string; role: MembershipRole;
}) {
  validateRole(input.actorRole, input.role);
  const email = normalizeEmail(input.email);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName || !emailPattern.test(email) || email.length > 254)
    throw new Error("Enter a valid name and email address.");
  const token = generateInvitationToken();
  const invitation = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.teamInvitation.findFirst({
      where: { companyId: input.companyId, email, status: "Pending", expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (duplicate) throw new Error("A pending invitation already exists for this team member.");
    await tx.teamInvitation.updateMany({
      where: { companyId: input.companyId, email, status: "Pending", expiresAt: { lte: new Date() } },
      data: { status: "Expired" },
    });
    let employee = await tx.employee.findFirst({ where: { companyId: input.companyId, email: { equals: email, mode: "insensitive" } } });
    if (!employee) employee = await tx.employee.create({
      data: { companyId: input.companyId, firstName, lastName, email, role: employeeRole(input.role), status: "Onboarding", invitationStatus: "Pending", invitationSentAt: new Date() },
    });
    const row = await tx.teamInvitation.create({
      data: { companyId: input.companyId, employeeId: employee.id, email, role: input.role, tokenHash: hashInvitationToken(token), expiresAt: new Date(Date.now() + invitationLifetimeMs), createdByUserId: input.actingUserId },
      include: { company: { select: { name: true } } },
    });
    await tx.employee.update({ where: { id: employee.id }, data: { invitationStatus: "Pending", invitationSentAt: new Date() } });
    await tx.auditEvent.create({ data: { companyId: input.companyId, actingUserId: input.actingUserId, eventType: "team.invitation_created", entityType: "TeamInvitation", entityId: row.id, metadata: { employeeId: employee.id, role: input.role } } });
    return row;
  });
  await sendInviteEmail({ id: invitation.id, email, companyName: invitation.company.name, token, reminder: false });
  return { id: invitation.id };
}

export async function resendTeamInvitation(companyId: string, actingUserId: string, actorRole: MembershipRole, invitationId: string) {
  const token = generateInvitationToken();
  const row = await prisma.$transaction(async (tx) => {
    const invitation = await tx.teamInvitation.findFirst({ where: { id: invitationId, companyId }, include: { company: { select: { name: true } } } });
    if (!invitation || invitation.status !== "Pending") throw new Error("Invitation is not available.");
    validateRole(actorRole, invitation.role);
    const updated = await tx.teamInvitation.update({
      where: { id: invitation.id },
      data: { tokenHash: hashInvitationToken(token), expiresAt: new Date(Date.now() + invitationLifetimeMs) },
      include: { company: { select: { name: true } } },
    });
    await tx.employee.update({ where: { id: invitation.employeeId }, data: { invitationStatus: "Pending", invitationSentAt: new Date() } });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "team.invitation_resent", entityType: "TeamInvitation", entityId: invitation.id } });
    return updated;
  });
  await sendInviteEmail({ id: row.id, email: row.email, companyName: row.company.name, token, reminder: true });
}

export async function revokeTeamInvitation(companyId: string, actingUserId: string, invitationId: string) {
  await prisma.$transaction(async (tx) => {
    const invitation = await tx.teamInvitation.findFirst({ where: { id: invitationId, companyId }, select: { id: true, employeeId: true, status: true } });
    if (!invitation || invitation.status !== "Pending") throw new Error("Invitation is not available.");
    const changed = await tx.teamInvitation.updateMany({ where: { id: invitation.id, companyId, status: "Pending" }, data: { status: "Revoked", revokedAt: new Date() } });
    if (changed.count !== 1) throw new Error("Invitation is not available.");
    await tx.employee.update({ where: { id: invitation.employeeId }, data: { invitationStatus: "Revoked" } });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "team.invitation_revoked", entityType: "TeamInvitation", entityId: invitation.id } });
  });
}

export async function listTeamInvitations(companyId: string) {
  const expired = await prisma.teamInvitation.findMany({ where: { companyId, status: "Pending", expiresAt: { lte: new Date() } }, select: { id: true } });
  if (expired.length) await prisma.$transaction(async (tx) => {
    for (const invitation of expired) {
      const changed = await tx.teamInvitation.updateMany({ where: { id: invitation.id, companyId, status: "Pending" }, data: { status: "Expired" } });
      if (changed.count) await tx.auditEvent.create({ data: { companyId, eventType: "team.invitation_expired", entityType: "TeamInvitation", entityId: invitation.id } });
    }
  });
  return prisma.teamInvitation.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, email: true, role: true, status: true, expiresAt: true, createdAt: true, employee: { select: { firstName: true, lastName: true } } },
  });
}

export type InvitationView = { state: "valid" | "expired" | "revoked" | "accepted" | "invalid"; companyName?: string; email?: string; existingAccount?: boolean };
export async function validateTeamInvitation(rawToken: string): Promise<InvitationView> {
  if (!rawToken || rawToken.length > 256) return { state: "invalid" };
  const invitation = await prisma.teamInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(rawToken) },
    include: { company: { select: { name: true, active: true } } },
  });
  if (!invitation || !invitation.company.active) return { state: "invalid" };
  if (invitation.status === "Accepted") return { state: "accepted" };
  if (invitation.status === "Revoked") return { state: "revoked" };
  if (invitation.status === "Expired" || invitation.expiresAt <= new Date()) {
    if (invitation.status === "Pending") await prisma.$transaction([
      prisma.teamInvitation.updateMany({ where: { id: invitation.id, status: "Pending" }, data: { status: "Expired" } }),
      prisma.auditEvent.create({ data: { companyId: invitation.companyId, eventType: "team.invitation_expired", entityType: "TeamInvitation", entityId: invitation.id } }),
    ]);
    return { state: "expired" };
  }
  const existingAccount = Boolean(await prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } }));
  return { state: "valid", companyName: invitation.company.name, email: invitation.email, existingAccount };
}

export async function acceptTeamInvitation(input: {
  token: string; authenticatedUserId?: string; firstName?: string; lastName?: string; password?: string; passwordConfirmation?: string;
}) {
  const tokenHash = hashInvitationToken(input.token);
  const invitation = await prisma.teamInvitation.findUnique({ where: { tokenHash }, select: { email: true } });
  if (!invitation) throw new Error(genericInvitationError);
  const existing = await prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
  if (existing && existing.id !== input.authenticatedUserId) throw new Error("Sign in with the invited email address before joining this company.");
  let passwordHash: string | undefined;
  if (!existing) {
    if (!input.firstName?.trim() || !input.lastName?.trim()) throw new Error("Enter your first and last name.");
    if (!input.password || input.password.length < signupPasswordMinimum || input.password.length > 128) throw new Error(`Password must be between ${signupPasswordMinimum} and 128 characters.`);
    if (input.password !== input.passwordConfirmation) throw new Error("Passwords do not match.");
    passwordHash = await bcrypt.hash(input.password, 12);
  }
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.teamInvitation.findUnique({ where: { tokenHash } });
    if (!current || current.status !== "Pending" || current.expiresAt <= new Date()) throw new Error(genericInvitationError);
    const claimed = await tx.teamInvitation.updateMany({ where: { id: current.id, status: "Pending", acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, data: { status: "Accepted", acceptedAt: new Date() } });
    if (claimed.count !== 1) throw new Error(genericInvitationError);
    let user = existing;
    if (!user) user = await tx.user.create({ data: { companyId: current.companyId, email: current.email, firstName: input.firstName!.trim(), lastName: input.lastName!.trim(), passwordHash: passwordHash!, role: userRole(current.role), active: true }, select: { id: true } });
    await tx.companyMembership.upsert({
      where: { userId_companyId: { userId: user.id, companyId: current.companyId } },
      create: { userId: user.id, companyId: current.companyId, role: current.role, status: "Active" },
      update: { role: current.role, status: "Active" },
    });
    await tx.employee.update({ where: { id: current.employeeId }, data: { userId: user.id, status: "Active", invitationStatus: "Accepted" } });
    await tx.teamInvitation.update({ where: { id: current.id }, data: { acceptedById: user.id } });
    await tx.auditEvent.create({ data: { companyId: current.companyId, actingUserId: user.id, eventType: "team.invitation_accepted", entityType: "TeamInvitation", entityId: current.id, metadata: { employeeId: current.employeeId, role: current.role, existingUser: Boolean(existing) } } });
    return { companyId: current.companyId, userId: user.id };
  }, { isolationLevel: "Serializable" });
  await createNotification({ companyId: result.companyId, userId: result.userId, channel: "email", to: invitation.email, title: "JunkQuote Pro invitation accepted", body: "Your company access is active. You can now sign in to JunkQuote Pro." });
  return result;
}
