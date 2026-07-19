"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  signUpAction,
  type SignupActionState,
} from "@/app/actions/auth/signUp";

const initialState: SignupActionState = { error: null };

export default function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, initialState);
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <form
        action={action}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow"
        aria-describedby={state.error ? "sign-up-error" : undefined}
      >
        <p className="text-sm font-semibold text-blue-700">JunkQuote Pro</p>
        <h1 className="mt-2 text-2xl font-bold">Create your company account</h1>
        <p className="mt-2 text-sm text-slate-600">
          You’ll be the owner of a new, isolated company workspace.
        </p>
        {state.error && (
          <p
            id="sign-up-error"
            role="alert"
            className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700"
          >
            {state.error}
          </p>
        )}
        <Field
          label="Company name"
          name="companyName"
          autoComplete="organization"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="First name"
            name="firstName"
            autoComplete="given-name"
          />
          <Field label="Last name" name="lastName" autoComplete="family-name" />
        </div>
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="Use at least 12 characters."
          minLength={12}
        />
        <Field
          label="Confirm password"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          minLength={12}
        />
        <button
          type="submit"
          aria-busy={pending}
          disabled={pending}
          className="mt-5 w-full rounded bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Creating account..." : "Create account"}
        </button>
        <p aria-live="polite" className="sr-only">
          {pending ? "Creating your account." : ""}
        </p>
        <p className="mt-5 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            className="font-semibold text-blue-700 underline"
            href="/sign-in"
          >
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  hint,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
  hint?: string;
  minLength?: number;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <label className="mt-3 grid gap-1 text-sm font-medium">
      {label}
      <input
        required
        disabled={false}
        name={name}
        type={type}
        autoComplete={autoComplete}
        minLength={minLength}
        aria-describedby={hintId}
        className="rounded border p-2"
      />
      {hint && (
        <span id={hintId} className="text-xs font-normal text-slate-500">
          {hint}
        </span>
      )}
    </label>
  );
}
