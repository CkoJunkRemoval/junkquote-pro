"use server";

import { revalidatePath } from "next/cache";
import type {
  CompensationType,
  EmployeeRole,
  EmployeeStatus,
  MembershipRole,
  WorkerType,
  WorkforceDocumentCategory,
} from "@/generated/prisma/client";
import { requireTenantContext } from "@/lib/auth/tenant";
import { prisma } from "@/lib/prisma";
import { saveWorkforceDocument } from "@/lib/storage/workforceDocumentStorage";
import { requireWorkforceCapability, type WorkforceCapability } from "@/lib/workforce/permissions";
import * as workforce from "@/lib/workforce/service";
import { createTeamInvitation } from "@/lib/teamInvitations/service";

async function context(capability: WorkforceCapability) {
  const value = await requireTenantContext();
  requireWorkforceCapability(value.role, capability);
  return value;
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optionalDate = (value: string) => (value ? new Date(`${value}T12:00:00`) : null);
const refresh = (employeeId?: string) => {
  revalidatePath("/team");
  revalidatePath("/team/onboarding");
  revalidatePath("/team/credentials");
  if (employeeId) revalidatePath(`/team/${employeeId}`);
};

function profile(form: FormData): workforce.WorkforceProfileInput {
  return {
    employeeNumber: text(form, "employeeNumber"),
    firstName: text(form, "firstName"),
    middleName: text(form, "middleName"),
    lastName: text(form, "lastName"),
    preferredName: text(form, "preferredName"),
    email: text(form, "email"),
    phone: text(form, "phone"),
    addressLine1: text(form, "addressLine1"),
    addressLine2: text(form, "addressLine2"),
    city: text(form, "city"),
    state: text(form, "state"),
    postalCode: text(form, "postalCode"),
    workerType: text(form, "workerType") as WorkerType,
    role: text(form, "role") as EmployeeRole,
    jobTitle: text(form, "jobTitle"),
    department: text(form, "department"),
    hireDate: optionalDate(text(form, "hireDate")),
    managerId: text(form, "managerId") || null,
    defaultCrewId: text(form, "defaultCrewId") || null,
    notes: text(form, "notes"),
    authorizedDriver: form.get("authorizedDriver") === "on",
    driverLicenseState: text(form, "driverLicenseState"),
    driverLicenseExpiresAt: optionalDate(text(form, "driverLicenseExpiresAt")),
    driverLicenseClass: text(form, "driverLicenseClass"),
    drivingRestrictions: text(form, "drivingRestrictions"),
  };
}

export async function createWorkforceMemberAction(form: FormData) {
  const c = await context("workforce.manage");
  const member = await workforce.createWorkforceMember(c.companyId, c.user.id, profile(form));
  refresh(member.id);
  return member.id;
}

export async function updateWorkforceMemberAction(employeeId: string, form: FormData) {
  const c = await context("workforce.manage");
  await workforce.updateWorkforceProfile(c.companyId, c.user.id, employeeId, profile(form));
  refresh(employeeId);
}

export async function transitionWorkforceStatusAction(employeeId: string, form: FormData) {
  const c = await context("workforce.manage");
  await workforce.transitionWorkforceStatus(
    c.companyId,
    c.user.id,
    employeeId,
    text(form, "status") as EmployeeStatus,
    text(form, "reason"),
  );
  refresh(employeeId);
}

export async function addCompensationAction(employeeId: string, form: FormData) {
  const c = await context("workforce.compensation.manage");
  const hourly = text(form, "hourlyRate");
  const salary = text(form, "annualSalary");
  await workforce.addCompensationRecord(c.companyId, c.user.id, employeeId, {
    compensationType: text(form, "compensationType") as CompensationType,
    hourlyRateCents: hourly ? Math.round(Number(hourly) * 100) : null,
    annualSalaryCents: salary ? Math.round(Number(salary) * 100) : null,
    effectiveStartDate: optionalDate(text(form, "effectiveStartDate")) ?? new Date(),
    effectiveEndDate: optionalDate(text(form, "effectiveEndDate")),
    overtimeEligible: form.get("overtimeEligible") === "on",
    notes: text(form, "notes"),
  });
  refresh(employeeId);
}

export async function addEmergencyContactAction(employeeId: string, form: FormData) {
  const c = await context("workforce.manage");
  await workforce.addEmergencyContact(c.companyId, employeeId, {
    name: text(form, "name"),
    relationship: text(form, "relationship"),
    phone: text(form, "phone"),
    alternatePhone: text(form, "alternatePhone"),
    priority: Math.max(1, Number(text(form, "priority") || 1)),
    notes: text(form, "notes"),
  });
  refresh(employeeId);
}

export async function addCredentialAction(employeeId: string, form: FormData) {
  const c = await context("workforce.credentials.manage");
  await workforce.addCredential(c.companyId, c.user.id, employeeId, {
    type: text(form, "type"),
    title: text(form, "title"),
    identifier: text(form, "identifier"),
    issuingOrganization: text(form, "issuingOrganization"),
    issuedDate: optionalDate(text(form, "issuedDate")),
    expirationDate: optionalDate(text(form, "expirationDate")),
    notes: text(form, "notes"),
  });
  refresh(employeeId);
}

export async function completeOnboardingItemAction(itemId: string) {
  const c = await context("workforce.onboarding.manage");
  const item = await workforce.completeOnboardingItem(c.companyId, c.user.id, itemId);
  refresh(item.employeeId);
}

export async function addOnboardingItemAction(employeeId: string, form: FormData) {
  const c = await context("workforce.onboarding.manage");
  await workforce.addOnboardingItem(c.companyId, employeeId, {
    title: text(form, "title"),
    category: text(form, "category"),
    required: form.get("required") === "on",
    dueDate: optionalDate(text(form, "dueDate")),
    notes: text(form, "notes"),
  });
  refresh(employeeId);
}

export async function linkApplicationUserAction(employeeId: string, form: FormData) {
  const c = await context("workforce.manage");
  await workforce.linkApplicationUser(c.companyId, c.user.id, employeeId, text(form, "userId"));
  refresh(employeeId);
}

export async function unlinkApplicationUserAction(employeeId: string) {
  const c = await context("workforce.manage");
  await workforce.unlinkApplicationUser(c.companyId, c.user.id, employeeId);
  refresh(employeeId);
}

export async function prepareWorkforceInvitationAction(employeeId: string, form: FormData) {
  const c = await context("workforce.manage");
  const role = text(form, "role") as MembershipRole;
  const member = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: c.companyId },
    select: { email: true, firstName: true, lastName: true },
  });
  if (!member?.email) throw new Error("An email address is required before preparing access.");
  await createTeamInvitation({
    companyId: c.companyId,
    actingUserId: c.user.id,
    actorRole: c.role,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    role,
  });
  refresh(employeeId);
}

export async function uploadWorkforceDocumentAction(employeeId: string, form: FormData) {
  const c = await context("workforce.documents.manage");
  const member = await prisma.employee.findFirst({ where: { id: employeeId, companyId: c.companyId }, select: { id: true } });
  if (!member) throw new Error("Workforce member not found.");
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Choose a document.");
  const stored = await saveWorkforceDocument(c.companyId, employeeId, file);
  await prisma.$transaction(async (tx) => {
    const document = await tx.workforceDocument.create({
      data: {
        companyId: c.companyId,
        employeeId,
        category: text(form, "category") as WorkforceDocumentCategory,
        storageKey: stored.storageKey,
        displayFilename: file.name.slice(0, 240),
        mimeType: file.type,
        sizeBytes: stored.sizeBytes,
        uploadedByUserId: c.user.id,
        effectiveDate: optionalDate(text(form, "effectiveDate")),
        expirationDate: optionalDate(text(form, "expirationDate")),
        notes: text(form, "notes") || null,
      },
    });
    await tx.auditEvent.create({
      data: {
        companyId: c.companyId,
        actingUserId: c.user.id,
        eventType: "workforce.document_uploaded",
        entityType: "Employee",
        entityId: employeeId,
        metadata: { documentId: document.id, category: document.category },
      },
    });
  });
  refresh(employeeId);
}
