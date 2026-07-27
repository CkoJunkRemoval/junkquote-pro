"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth/resetPassword";
import PasswordInput from "@/components/forms/PasswordInput";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, { error: null, success: false });
  if (state.success)
    return <p>Password updated. <Link className="underline" href="/sign-in">Sign in</Link>.</p>;
  return <form action={action} className="space-y-4">
    <input type="hidden" name="token" value={token} />
    <PasswordInput label="New password" name="password" minLength={12} maxLength={128} required autoComplete="new-password" />
    <PasswordInput label="Confirm password" name="passwordConfirmation" minLength={12} maxLength={128} required autoComplete="new-password" />
    {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
    <button disabled={pending} className="auth-submit">{pending ? "Updating…" : "Update password"}</button>
  </form>;
}
