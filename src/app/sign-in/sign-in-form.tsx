"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { LockKeyhole, Mail, Truck } from "lucide-react";
import BrandedAuthLayout from "@/components/branding/BrandedAuthLayout";

export default function SignInForm({
  callbackUrl,
  accountCreated = false,
}: {
  callbackUrl: string;
  accountCreated?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    if (result?.error)
      setError("Invalid email, password, or company membership.");
    else window.location.assign(callbackUrl);
    setLoading(false);
  }
  return (
    <BrandedAuthLayout>
      <form
        onSubmit={submit}
        className="auth-card"
      >
        <div className="auth-card__mobile-brand" aria-hidden="true">
          <Truck size={22} />
          <strong>JUNK<span>QUOTE</span> <small>PRO</small></strong>
        </div>
        <p className="auth-card__eyebrow">Secure business workspace</p>
        <h1>Welcome Back</h1>
        <p className="auth-card__intro">Sign in to your account</p>
        {accountCreated && (
          <p
            role="status"
            className="auth-message auth-message--success"
          >
            Your company account is ready. Sign in to continue.
          </p>
        )}
        {error && (
          <p
            id="sign-in-error"
            role="alert"
            className="auth-message auth-message--error"
          >
            {error}
          </p>
        )}
        <label className="auth-field">
          <span>Email address</span>
          <Mail aria-hidden="true" size={18} />
          <input
            id="sign-in-email"
            autoComplete="username"
            aria-describedby={error ? "sign-in-error" : undefined}
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <LockKeyhole aria-hidden="true" size={18} />
          <input
            id="sign-in-password"
            autoComplete="current-password"
            aria-describedby={error ? "sign-in-error" : undefined}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
          />
        </label>
        <button
          type="submit"
          aria-busy={loading}
          disabled={loading}
          className="auth-submit"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="auth-card__signup">
          New to JunkQuote Pro?{" "}
          <Link
            className="font-semibold"
            href="/sign-up"
          >
            Create account
          </Link>
        </p>
        <p className="auth-card__legal">© {new Date().getFullYear()} JunkQuote Pro. All rights reserved.</p>
      </form>
    </BrandedAuthLayout>
  );
}
