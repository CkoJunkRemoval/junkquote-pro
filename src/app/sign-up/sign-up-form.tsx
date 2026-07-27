"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  signUpAction,
  type SignupActionState,
} from "@/app/actions/auth/signUp";
import PasswordInput from "@/components/forms/PasswordInput";
import BrandedAuthLayout from "@/components/branding/BrandedAuthLayout";

const initialState: SignupActionState = { error: null };

export default function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, initialState);
  return (
    <BrandedAuthLayout>
      <form
        action={action}
        className="auth-card"
        aria-describedby={state.error ? "sign-up-error" : undefined}
      >
        <p className="auth-card__eyebrow">JunkQuote Pro</p>
        <h1>Create your company account</h1>
        <p className="auth-card__intro">
          You’ll be the owner of a new, isolated company workspace.
        </p>
        {state.error && (
          <p
            id="sign-up-error"
            role="alert"
            className="auth-message auth-message--error"
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
        <PasswordInput
          label="Password"
          name="password"
          autoComplete="new-password"
          hint="Use at least 12 characters."
          minLength={12}
          maxLength={128}
          required
          wrapperClassName="mt-3"
        />
        <PasswordInput
          label="Confirm password"
          name="passwordConfirmation"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          wrapperClassName="mt-3"
        />
        <button
          type="submit"
          aria-busy={pending}
          disabled={pending}
          className="auth-submit"
        >
          {pending ? "Creating account..." : "Create account"}
        </button>
        <p aria-live="polite" className="sr-only">
          {pending ? "Creating your account." : ""}
        </p>
        <p className="auth-card__signup">
          Already have an account?{" "}
          <Link
            className="font-semibold"
            href="/sign-in"
          >
            Sign in
          </Link>
        </p>
      </form>
    </BrandedAuthLayout>
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
    <label className="auth-field">
      <span>{label}</span>
      <input
        required
        disabled={false}
        name={name}
        type={type}
        autoComplete={autoComplete}
        minLength={minLength}
        aria-describedby={hintId}
      />
      {hint && (
        <span id={hintId} className="auth-field__hint">
          {hint}
        </span>
      )}
    </label>
  );
}
