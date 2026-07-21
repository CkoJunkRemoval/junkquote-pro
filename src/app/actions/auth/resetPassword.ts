"use server";

import { consumeAdminPasswordResetToken } from "@/lib/admin/passwordReset";

export type ResetPasswordState = { error: string | null; success: boolean };

export async function resetPasswordAction(
  _state: ResetPasswordState,
  data: FormData,
): Promise<ResetPasswordState> {
  try {
    await consumeAdminPasswordResetToken({
      token: String(data.get("token") ?? ""),
      password: String(data.get("password") ?? ""),
      passwordConfirmation: String(data.get("passwordConfirmation") ?? ""),
    });
    return { error: null, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Password reset failed.", success: false };
  }
}
