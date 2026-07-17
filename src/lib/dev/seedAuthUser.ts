import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DEVELOPMENT_COMPANY_ID } from "@/lib/config";

/** Development-only seed. Set DEV_AUTH_PASSWORD before invoking outside local development. */
export async function seedDevelopmentAuthUser() {
  const email = (process.env.DEV_AUTH_EMAIL ?? "owner@junkquote.local").trim().toLowerCase();
  const password = process.env.DEV_AUTH_PASSWORD ?? "ChangeMe!123";
  const company = await prisma.company.findUnique({ where: { id: DEVELOPMENT_COMPANY_ID } });
  if (!company) throw new Error("Development company not found.");
  const user = await prisma.user.upsert({ where: { email }, update: { active: true }, create: { companyId: company.id, email, firstName: "Development", lastName: "Owner", passwordHash: await bcrypt.hash(password, 12), role: "OWNER" } });
  await prisma.companyMembership.upsert({ where: { userId_companyId: { userId: user.id, companyId: company.id } }, update: { role: "Owner", status: "Active" }, create: { userId: user.id, companyId: company.id, role: "Owner", status: "Active" } });
  return { email, password: process.env.DEV_AUTH_PASSWORD ? "configured via DEV_AUTH_PASSWORD" : password };
}
