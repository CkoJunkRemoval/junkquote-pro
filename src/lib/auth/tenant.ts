import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { MembershipRole, MembershipStatus } from "@/generated/prisma/client";

export type TenantContext = {
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  membership: { id: string; role: MembershipRole; status: MembershipStatus; billingAdmin: boolean };
  company: { id: string; name: string };
  companyId: string;
  role: MembershipRole;
};

export class AuthorizationError extends Error { constructor(public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_MEMBERSHIP" | "FORBIDDEN", message: string) { super(message); this.name = "AuthorizationError"; } }

const resolveTenantContext = cache(async (): Promise<TenantContext | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const membership = await prisma.companyMembership.findFirst({
    where: { userId: session.user.id, status: "Active", company: { active: true } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, role: true, status: true, billingAdmin: true, companyId: true,
      company: { select: { id: true, name: true } },
      user: { select: { id: true, email: true, firstName: true, lastName: true, sessionVersion: true } },
    },
  });
  if (!membership) throw new AuthorizationError("NO_ACTIVE_MEMBERSHIP", "An active company membership is required.");
  const tokenVersion=(session as typeof session & {sessionVersion?:number}).sessionVersion;
  if(typeof tokenVersion==="number"&&tokenVersion!==membership.user.sessionVersion)throw new AuthorizationError("UNAUTHENTICATED","This session has been revoked. Sign in again.");
  return { user: membership.user, membership: { id: membership.id, role: membership.role, status: membership.status, billingAdmin: membership.billingAdmin }, company: membership.company, companyId: membership.companyId, role: membership.role };
});

export function getTenantContext() { return resolveTenantContext(); }
export async function requireTenantContext() { const context = await getTenantContext(); if (!context) throw new AuthorizationError("UNAUTHENTICATED", "Sign in is required."); return context; }
export async function requireTenantRole(...roles: MembershipRole[]) { const context = await requireTenantContext(); if (!roles.includes(context.role)) throw new AuthorizationError("FORBIDDEN", "Your company role cannot perform this action."); return context; }
export function requireOperationalTenant() { return requireTenantRole("Owner", "Admin", "Manager", "Office"); }
export function requireAdminTenant() { return requireTenantRole("Owner", "Admin"); }

export async function requireAuthenticatedUser() { return (await requireTenantContext()).user; }
export async function resolveActiveMembership(userId: string) { return prisma.companyMembership.findFirst({ where: { userId, status: "Active", company: { active: true } }, orderBy: { createdAt: "asc" }, include: { company: true } }); }
export async function requireActiveMembership() { const context = await requireTenantContext(); return { ...context.membership, companyId: context.companyId, company: context.company, user: context.user }; }
export async function getCurrentCompanyId() { return (await requireTenantContext()).companyId; }
export async function getCurrentCompany() { return (await requireTenantContext()).company; }
export function requireCompanyRole(...roles: MembershipRole[]) { return requireTenantRole(...roles); }
export function safeReturnUrl(value: string | null | undefined) { return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"; }
