import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";

export function normalizeAdminEmail(value: string | undefined | null) { return value?.trim().toLowerCase() ?? ""; }
export function configuredPlatformAdminEmails(environment: NodeJS.ProcessEnv = process.env) {
  return new Set(
    [environment.PLATFORM_ADMIN_EMAIL, ...(environment.PLATFORM_ADMIN_EMAILS ?? "").split(",")]
      .map(normalizeAdminEmail)
      .filter(Boolean),
  );
}
export async function requirePlatformAdmin(operation = "platform_admin.access") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Platform administrator sign-in is required.");
  if (!(await checkRateLimit(`system-admin:${session.user.id}`, ratePolicies.systemAdmin)).allowed) throw new Error("Too many administrative requests. Try again later.");
  const configured = configuredPlatformAdminEmails();
  if (process.env.NODE_ENV === "production" && configured.size === 0) throw new Error("Platform administration bootstrap is not configured.");
  const existingAdmins = await prisma.user.count({ where: { platformAdmin: true, active: true } });
  const email = normalizeAdminEmail(session.user.email);
  if (existingAdmins === 0 && configured.has(email))
    await prisma.user.updateMany({ where: { id: session.user.id, email: { equals: email, mode: "insensitive" }, platformAdmin: false }, data: { platformAdmin: true } });
  const user = await prisma.user.findFirst({ where: { id: session.user.id, active: true, platformAdmin: true }, select: { id: true, email: true, firstName: true, lastName: true, platformAdmin: true } });
  if (!user) throw new Error("Platform administrator access is required.");
  await prisma.auditEvent.create({ data: { actingUserId: user.id, eventType: operation, entityType: "PlatformAdministration", entityId: user.id } });
  return user;
}
