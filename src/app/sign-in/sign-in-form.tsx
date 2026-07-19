"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

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
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow"
      >
        <p className="text-sm font-semibold text-blue-700">JunkQuote Pro</p>
        <h1 className="mt-2 text-2xl font-bold">Sign in</h1>
        {accountCreated && (
          <p
            role="status"
            className="mt-4 rounded bg-green-50 p-3 text-sm text-green-800"
          >
            Your company account is ready. Sign in to continue.
          </p>
        )}
        {error && (
          <p
            id="sign-in-error"
            role="alert"
            className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <label className="mt-5 grid gap-1 text-sm font-medium">
          Email
          <input
            id="sign-in-email"
            autoComplete="username"
            aria-describedby={error ? "sign-in-error" : undefined}
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded border p-2"
          />
        </label>
        <label className="mt-3 grid gap-1 text-sm font-medium">
          Password
          <input
            id="sign-in-password"
            autoComplete="current-password"
            aria-describedby={error ? "sign-in-error" : undefined}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded border p-2"
          />
        </label>
        <button
          type="submit"
          aria-busy={loading}
          disabled={loading}
          className="mt-5 w-full rounded bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="mt-5 text-center text-sm text-slate-600">
          New to JunkQuote Pro?{" "}
          <Link
            className="font-semibold text-blue-700 underline"
            href="/sign-up"
          >
            Create account
          </Link>
        </p>
      </form>
    </main>
  );
}
