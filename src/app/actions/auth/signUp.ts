"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createCompanyOwner, type SignupInput } from "@/lib/auth/signup";
import { AppError } from "@/lib/errors/appError";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";

export type SignupActionState = { error: string | null };

const field = (data: FormData, name: keyof SignupInput) => {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
};

export async function signUpAction(
  _state: SignupActionState,
  data: FormData,
): Promise<SignupActionState> {
  const input: SignupInput = {
    companyName: field(data, "companyName"),
    firstName: field(data, "firstName"),
    lastName: field(data, "lastName"),
    email: field(data, "email"),
    password: field(data, "password"),
    passwordConfirmation: field(data, "passwordConfirmation"),
  };
  const requestHeaders = await headers();
  const forwarded = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const clientKey = forwarded || requestHeaders.get("x-real-ip") || "unknown";
  const normalizedEmail = input.email.trim().toLowerCase();
  console.log("[signup] action invoked", {
    operation: "self_service_signup",
    email: normalizedEmail,
  });
  if (
    !checkRateLimit(`staff-sign-up:ip:${clientKey}`, ratePolicies.signUp)
      .allowed ||
    !checkRateLimit(
      `staff-sign-up:email:${normalizedEmail}`,
      ratePolicies.signUp,
    ).allowed
  ) {
    console.error("[signup] rate-limited", {
      operation: "self_service_signup",
      email: normalizedEmail,
    });
    return {
      error: "Too many account creation attempts. Please try again later.",
    };
  }
  try {
    await createCompanyOwner(input);
  } catch (error) {
    if (error instanceof AppError) {
      const branch =
        error.code === "VALIDATION_FAILED"
          ? "validation"
          : error.code === "CONFLICT"
            ? "duplicate-email-result"
            : error.code === "DATABASE_FAILED"
              ? "transaction-failed-result"
              : "application-error";
      console.error(`[signup] ${branch}`, {
        operation: "self_service_signup",
        email: normalizedEmail,
        code: error.code,
      });
      return { error: error.message };
    }
    console.error("[signup] unexpected-action-failure", {
      operation: "self_service_signup",
      email: normalizedEmail,
      error:
        error instanceof Error
          ? { name: error.name }
          : { type: typeof error },
    });
    return {
      error: "Account creation could not be completed. Please try again.",
    };
  }
  console.log("[signup] redirecting after success", {
    operation: "self_service_signup",
    email: normalizedEmail,
  });
  redirect("/sign-in?created=1");
}
