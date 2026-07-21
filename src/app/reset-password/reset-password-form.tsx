"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth/resetPassword";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, { error: null, success: false });
  if (state.success)
    return <p>Password updated. <Link className="underline" href="/sign-in">Sign in</Link>.</p>;
  return <form action={action} className="space-y-4">
    <input type="hidden" name="token" value={token} />
    <label className="block">New password<input className="mt-1 w-full rounded border p-2" type="password" name="password" minLength={12} maxLength={128} required autoComplete="new-password" /></label>
    <label className="block">Confirm password<input className="mt-1 w-full rounded border p-2" type="password" name="passwordConfirmation" minLength={12} maxLength={128} required autoComplete="new-password" /></label>
    {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
    <button disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white">{pending ? "Updating…" : "Update password"}</button>
  </form>;
}
