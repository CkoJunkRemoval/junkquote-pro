import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors/appError";
import { billingConfig } from "@/lib/billing/config";

export const signupPasswordMinimum = 12;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sensitiveKey = /password|hash|secret|token|cookie|authorization|database.?url|api.?key/i;

function redactErrorText(value: string) {
  let redacted = value
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[REDACTED]@")
    .replace(/(bearer\s+)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/((?:password|secret|token|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, "$1[REDACTED]");
  for (const key of [
    "DATABASE_URL",
    "DATABASE_URL_TEST",
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "RESEND_API_KEY",
    "RESEND_WEBHOOK_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    const secret = process.env[key];
    if (secret && secret.length >= 4) redacted = redacted.replaceAll(secret, "[REDACTED]");
  }
  return redacted;
}

function safeErrorValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]";
  if (typeof value === "string") return redactErrorText(value);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => safeErrorValue(item, depth + 1));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitiveKey.test(key) ? "[REDACTED]" : safeErrorValue(item, depth + 1),
      ]),
    );
  return value;
}

function logSignupFailure(
  error: unknown,
  normalizedEmail: string,
  stage: string,
) {
  const candidate = error as { code?: unknown; meta?: unknown };
  console.error("[signup] account creation failed", {
    operation: "create_company_owner",
    stage,
    email: normalizedEmail,
    error: error instanceof Error
      ? {
          name: error.name,
          message: redactErrorText(error.message),
          stack: error.stack ? redactErrorText(error.stack) : undefined,
          code: safeErrorValue(candidate.code),
          meta: safeErrorValue(candidate.meta),
        }
      : { type: typeof error, value: safeErrorValue(error) },
  });
}

export type SignupInput = {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

export type NormalizedSignupInput = SignupInput & { email: string };

function requiredText(value: string, label: string, maximum: number) {
  const normalized = value.trim();
  if (!normalized)
    throw new AppError("VALIDATION_FAILED", `${label} is required.`);
  if (normalized.length > maximum)
    throw new AppError("VALIDATION_FAILED", `${label} is too long.`);
  return normalized;
}

export function validateSignupInput(input: SignupInput): NormalizedSignupInput {
  const companyName = requiredText(input.companyName, "Company name", 120);
  const firstName = requiredText(input.firstName, "First name", 80);
  const lastName = requiredText(input.lastName, "Last name", 80);
  const email = input.email.trim().toLowerCase();
  if (!emailPattern.test(email) || email.length > 254)
    throw new AppError("VALIDATION_FAILED", "Enter a valid email address.");
  if (
    input.password.length < signupPasswordMinimum ||
    input.password.length > 128
  )
    throw new AppError(
      "VALIDATION_FAILED",
      `Password must be between ${signupPasswordMinimum} and 128 characters.`,
    );
  if (input.password !== input.passwordConfirmation)
    throw new AppError("VALIDATION_FAILED", "Passwords do not match.");
  return {
    companyName,
    firstName,
    lastName,
    email,
    password: input.password,
    passwordConfirmation: input.passwordConfirmation,
  };
}

export async function createCompanyOwner(input: SignupInput) {
  const value = validateSignupInput(input);
  let stage = "password-hash";
  try {
    const passwordHash = await bcrypt.hash(value.password, 12);
    stage = "transaction-start";
    const result = await prisma.$transaction(async (tx) => {
      stage = "company-create";
      const company = await tx.company.create({
        data: {
          name: value.companyName,
          legalName: value.companyName,
          displayName: value.companyName,
          email: value.email,
          active: true,
        },
      });
      stage = "user-create";
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          firstName: value.firstName,
          lastName: value.lastName,
          email: value.email,
          passwordHash,
          role: "OWNER",
          active: true,
        },
      });
      stage = "membership-create";
      const membership = await tx.companyMembership.create({
        data: {
          companyId: company.id,
          userId: user.id,
          role: "Owner",
          status: "Active",
        },
      });
      stage = "subscription-create";
      const trialStart = new Date();
      const trialEnd = new Date(trialStart);
      trialEnd.setDate(trialEnd.getDate() + billingConfig.trialDays);
      await tx.companySubscription.create({ data: { companyId: company.id, plan: "Professional", status: "Trialing", trialStart, trialEnd } });
      await tx.subscriptionHistory.create({ data: { companyId: company.id, plan: "Professional", status: "Trialing", source: "signup" } });
      await tx.companyOnboarding.create({ data: { companyId: company.id } });
      stage = "audit-create";
      await tx.auditEvent.create({
        data: {
          companyId: company.id,
          actingUserId: user.id,
          eventType: "company.self_service_signup",
          entityType: "Company",
          entityId: company.id,
        },
      });
      return {
        companyId: company.id,
        userId: user.id,
        membershipId: membership.id,
      };
    });
    console.log("[signup] transaction committed", {
      operation: "create_company_owner",
      email: value.email,
    });
    return result;
  } catch (error) {
    logSignupFailure(error, value.email, stage);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      console.error("[signup] duplicate-email", {
        operation: "create_company_owner",
        email: value.email,
      });
      throw new AppError(
        "CONFLICT",
        "An account cannot be created with those details.",
      );
    }
    if (error instanceof AppError) throw error;
    throw new AppError(
      "DATABASE_FAILED",
      "Account creation could not be completed. Please try again.",
    );
  }
}
