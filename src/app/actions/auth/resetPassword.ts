"use server";

import { consumeAdminPasswordResetToken } from "@/lib/admin/passwordReset";
import { headers } from "next/headers";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import { createHash } from "node:crypto";

export type ResetPasswordState = { error: string | null; success: boolean };

export async function resetPasswordAction(
  _state: ResetPasswordState,
  data: FormData,
): Promise<ResetPasswordState> {
  try {
    const token = String(data.get("token") ?? "");
    const requestHeaders = await headers();
    const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
    const tokenIdentity = createHash("sha256").update(token).digest("hex");
    if (!(await checkRateLimit(`password-reset:ip:${ip}`, ratePolicies.passwordReset)).allowed || !(await checkRateLimit(`password-reset:token:${tokenIdentity}`, ratePolicies.passwordReset)).allowed)
      return { error: "Too many password reset attempts. Try again later.", success: false };
    await consumeAdminPasswordResetToken({
      token,
      password: String(data.get("password") ?? ""),
      passwordConfirmation: String(data.get("passwordConfirmation") ?? ""),
    });
    return { error: null, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Password reset failed.", success: false };
  }
}
