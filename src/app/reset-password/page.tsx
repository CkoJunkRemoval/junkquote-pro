import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return <main className="mx-auto mt-20 max-w-md rounded-xl border bg-white p-6"><h1 className="mb-5 text-2xl font-bold">Reset password</h1>{token ? <ResetPasswordForm token={token} /> : <p>This password reset link is invalid.</p>}</main>;
}
