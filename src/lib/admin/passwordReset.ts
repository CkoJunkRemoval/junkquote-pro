import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { signupPasswordMinimum } from "@/lib/auth/signup";

export async function consumeAdminPasswordResetToken(input: {
  token: string;
  password: string;
  passwordConfirmation: string;
}) {
  if (!input.token || input.token.length > 256) throw new Error("This password reset link is invalid.");
  if (input.password.length < signupPasswordMinimum || input.password.length > 128)
    throw new Error(`Password must be between ${signupPasswordMinimum} and 128 characters.`);
  if (input.password !== input.passwordConfirmation) throw new Error("Passwords do not match.");

  const tokenHash = createHash("sha256").update(input.token).digest("hex");
  const passwordHash = await bcrypt.hash(input.password, 12);
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const token = await tx.adminPasswordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true, user: { select: { companyId: true } } },
    });
    if (!token || token.usedAt || token.expiresAt <= now)
      throw new Error("This password reset link is invalid or has expired.");
    const claimed = await tx.adminPasswordResetToken.updateMany({
      where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) throw new Error("This password reset link has already been used.");
    await tx.user.update({
      where: { id: token.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.auditEvent.create({
      data: {
        companyId: token.user.companyId,
        actingUserId: token.userId,
        eventType: "security.admin_password_reset_completed",
        entityType: "User",
        entityId: token.userId,
      },
    });
  });
}
