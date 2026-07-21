import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";

export function normalizeAdminEmail(value: string | undefined | null) { return value?.trim().toLowerCase() ?? ""; }
export async function requirePlatformAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Platform administrator sign-in is required.");
  if (!(await checkRateLimit(`system-admin:${session.user.id}`, ratePolicies.systemAdmin)).allowed) throw new Error("Too many administrative requests. Try again later.");
  const configured = normalizeAdminEmail(process.env.PLATFORM_ADMIN_EMAIL);
  if (process.env.NODE_ENV === "production" && !configured) throw new Error("Platform administration bootstrap is not configured.");
  const existingAdmins = await prisma.user.count({ where: { platformAdmin: true, active: true } });
  if (existingAdmins === 0 && configured && normalizeAdminEmail(session.user.email) === configured)
    await prisma.user.updateMany({ where: { id: session.user.id, email: { equals: configured, mode: "insensitive" }, platformAdmin: false }, data: { platformAdmin: true } });
  const user = await prisma.user.findFirst({ where: { id: session.user.id, active: true, platformAdmin: true }, select: { id: true, email: true, firstName: true, lastName: true, platformAdmin: true } });
  if (!user) throw new Error("Platform administrator access is required.");
  return user;
}
