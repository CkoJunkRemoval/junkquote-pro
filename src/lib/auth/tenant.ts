import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { MembershipRole } from "@/generated/prisma/client";

export class AuthorizationError extends Error { constructor(public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_MEMBERSHIP" | "FORBIDDEN", message: string) { super(message); this.name = "AuthorizationError"; } }

export async function requireAuthenticatedUser() { const session = await auth(); if (!session?.user?.id) throw new AuthorizationError("UNAUTHENTICATED", "Sign in is required."); return { id: session.user.id, email: session.user.email?.toLowerCase() ?? "" }; }
export async function resolveActiveMembership(userId: string) { return prisma.companyMembership.findFirst({ where: { userId, status: "Active", company: { active: true } }, orderBy: { createdAt: "asc" }, include: { company: true } }); }
export async function requireActiveMembership() { const user = await requireAuthenticatedUser(); const membership = await resolveActiveMembership(user.id); if (!membership) throw new AuthorizationError("NO_ACTIVE_MEMBERSHIP", "An active company membership is required."); return membership; }
export async function getCurrentCompanyId() { return (await requireActiveMembership()).companyId; }
export async function getCurrentCompany() { return (await requireActiveMembership()).company; }
export async function requireCompanyRole(...roles: MembershipRole[]) { const membership = await requireActiveMembership(); if (!roles.includes(membership.role)) throw new AuthorizationError("FORBIDDEN", "Your company role cannot perform this action."); return membership; }
export function safeReturnUrl(value: string | null | undefined) { return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"; }
