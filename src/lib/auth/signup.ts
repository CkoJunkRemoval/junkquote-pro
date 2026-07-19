import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors/appError";

export const signupPasswordMinimum = 12;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const passwordHash = await bcrypt.hash(value.password, 12);
  try {
    return await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: value.companyName,
          legalName: value.companyName,
          displayName: value.companyName,
          email: value.email,
          active: true,
        },
      });
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
      const membership = await tx.companyMembership.create({
        data: {
          companyId: company.id,
          userId: user.id,
          role: "Owner",
          status: "Active",
        },
      });
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new AppError(
        "CONFLICT",
        "An account cannot be created with those details.",
      );
    if (error instanceof AppError) throw error;
    throw new AppError(
      "DATABASE_FAILED",
      "Account creation could not be completed. Please try again.",
    );
  }
}
