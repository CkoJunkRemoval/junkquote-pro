import { ResetPasswordForm } from "./reset-password-form";
import BrandedAuthLayout from "@/components/branding/BrandedAuthLayout";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return <BrandedAuthLayout><main className="auth-card"><p className="auth-card__eyebrow">Secure account recovery</p><h1>Reset password</h1>{token ? <ResetPasswordForm token={token} /> : <p className="auth-message">This password reset link is invalid.</p>}</main></BrandedAuthLayout>;
}
