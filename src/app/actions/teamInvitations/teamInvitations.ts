"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MembershipRole } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { requireAdminTenant } from "@/lib/auth/tenant";
import {
  acceptTeamInvitation,
  createTeamInvitation,
  resendTeamInvitation,
  revokeTeamInvitation,
} from "@/lib/teamInvitations/service";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function createTeamInvitationAction(form: FormData) {
  const c = await requireAdminTenant();
  await createTeamInvitation({
    companyId: c.companyId,
    actingUserId: c.user.id,
    actorRole: c.role,
    firstName: text(form, "firstName"),
    lastName: text(form, "lastName"),
    email: text(form, "email"),
    role: text(form, "role") as MembershipRole,
  });
  revalidatePath("/team");
  revalidatePath("/team/invitations");
  redirect("/team/invitations?sent=1");
}

export async function resendTeamInvitationAction(form: FormData) {
  const c = await requireAdminTenant();
  await resendTeamInvitation(c.companyId, c.user.id, c.role, text(form, "invitationId"));
  revalidatePath("/team/invitations");
  redirect("/team/invitations?resent=1");
}

export async function revokeTeamInvitationAction(form: FormData) {
  const c = await requireAdminTenant();
  await revokeTeamInvitation(c.companyId, c.user.id, text(form, "invitationId"));
  revalidatePath("/team/invitations");
  redirect("/team/invitations?revoked=1");
}

export async function acceptTeamInvitationAction(form: FormData) {
  const session = await auth();
  await acceptTeamInvitation({
    token: text(form, "token"),
    authenticatedUserId: session?.user?.id,
    firstName: text(form, "firstName"),
    lastName: text(form, "lastName"),
    password: String(form.get("password") ?? ""),
    passwordConfirmation: String(form.get("passwordConfirmation") ?? ""),
  });
  redirect("/sign-in?joined=1");
}
