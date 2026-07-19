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
  if (
    !checkRateLimit(`staff-sign-up:ip:${clientKey}`, ratePolicies.signUp)
      .allowed ||
    !checkRateLimit(
      `staff-sign-up:email:${normalizedEmail}`,
      ratePolicies.signUp,
    ).allowed
  )
    return {
      error: "Too many account creation attempts. Please try again later.",
    };
  try {
    await createCompanyOwner(input);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    return {
      error: "Account creation could not be completed. Please try again.",
    };
  }
  redirect("/sign-in?created=1");
}
