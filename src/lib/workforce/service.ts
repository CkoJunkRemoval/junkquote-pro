import "server-only";

import type {
  CompensationType,
  EmployeeRole,
  EmployeeStatus,
  Prisma,
  WorkerType,
  WorkforceCredentialStatus,
  WorkforceDocumentCategory,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { assertWorkforceStatusTransition } from "./status";

const defaultChecklist = [
  ["Personal details completed", "Profile"],
  ["Emergency contact provided", "Safety"],
  ["Employment classification selected", "Employment"],
  ["Compensation record entered", "Compensation"],
  ["Company policy acknowledged", "Policy"],
  ["Driver documentation uploaded when applicable", "Driver"],
  ["Required certifications uploaded", "Credentials"],
  ["Application access configured when applicable", "Access"],
] as const;

export type WorkforceProfileInput = {
  employeeNumber?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  workerType: WorkerType;
  role: EmployeeRole;
  jobTitle?: string;
  department?: string;
  hireDate?: Date | null;
  managerId?: string | null;
  defaultCrewId?: string | null;
  notes?: string;
  authorizedDriver?: boolean;
  driverLicenseState?: string;
  driverLicenseExpiresAt?: Date | null;
  driverLicenseClass?: string;
  drivingRestrictions?: string;
};

export type WorkforceDirectoryInput = {
  search?: string;
  status?: EmployeeStatus;
  workerType?: WorkerType;
  jobTitle?: string;
  active?: boolean;
};

const clean = (value?: string) => value?.trim() || null;

async function verifyOptionalLinks(
  tx: Prisma.TransactionClient,
  companyId: string,
  input: Pick<WorkforceProfileInput, "managerId" | "defaultCrewId">,
) {
  if (
    input.managerId &&
    !(await tx.employee.findFirst({
      where: { id: input.managerId, companyId },
      select: { id: true },
    }))
  )
    throw new Error("Manager not found.");
  if (
    input.defaultCrewId &&
    !(await tx.crew.findFirst({
      where: { id: input.defaultCrewId, companyId },
      select: { id: true },
    }))
  )
    throw new Error("Default crew not found.");
}

function profileData(input: WorkforceProfileInput) {
  return {
    employeeNumber: clean(input.employeeNumber),
    firstName: input.firstName.trim(),
    middleName: clean(input.middleName),
    lastName: input.lastName.trim(),
    preferredName: clean(input.preferredName),
    email: clean(input.email)?.toLowerCase() ?? null,
    phone: clean(input.phone),
    addressLine1: clean(input.addressLine1),
    addressLine2: clean(input.addressLine2),
    city: clean(input.city),
    state: clean(input.state),
    postalCode: clean(input.postalCode),
    workerType: input.workerType,
    role: input.role,
    jobTitle: clean(input.jobTitle),
    department: clean(input.department),
    hireDate: input.hireDate ?? null,
    managerId: input.managerId ?? null,
    defaultCrewId: input.defaultCrewId ?? null,
    notes: clean(input.notes),
    authorizedDriver: Boolean(input.authorizedDriver),
    driverLicenseState: clean(input.driverLicenseState),
    driverLicenseExpiresAt: input.driverLicenseExpiresAt ?? null,
    driverLicenseClass: clean(input.driverLicenseClass),
    drivingRestrictions: clean(input.drivingRestrictions),
  };
}

export async function createWorkforceMember(
  companyId: string,
  actingUserId: string,
  input: WorkforceProfileInput,
) {
  if (!input.firstName.trim() || !input.lastName.trim())
    throw new Error("Legal first and last name are required.");
  return prisma.$transaction(async (tx) => {
    await verifyOptionalLinks(tx, companyId, input);
    const member = await tx.employee.create({
      data: {
        companyId,
        ...profileData(input),
        status: "Onboarding",
        certifications: [],
      },
    });
    await tx.workforceOnboardingItem.createMany({
      data: defaultChecklist.map(([title, category], priority) => ({
        companyId,
        employeeId: member.id,
        title,
        category,
        required: true,
        notes: `Default checklist item ${priority + 1}`,
      })),
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId,
        eventType: "workforce.member_created",
        entityType: "Employee",
        entityId: member.id,
        metadata: { workerType: member.workerType, status: member.status },
      },
    });
    return member;
  });
}

export async function updateWorkforceProfile(
  companyId: string,
  actingUserId: string,
  employeeId: string,
  input: WorkforceProfileInput,
) {
  return prisma.$transaction(async (tx) => {
    await verifyOptionalLinks(tx, companyId, input);
    const found = await tx.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { id: true },
    });
    if (!found) throw new Error("Workforce member not found.");
    const member = await tx.employee.update({
      where: { id: found.id },
      data: profileData(input),
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId,
        eventType: "workforce.profile_updated",
        entityType: "Employee",
        entityId: member.id,
      },
    });
    return member;
  });
}

export async function transitionWorkforceStatus(
  companyId: string,
  actingUserId: string,
  employeeId: string,
  status: EmployeeStatus,
  reason?: string,
) {
  return prisma.$transaction(async (tx) => {
    const member = await tx.employee.findFirst({
      where: { id: employeeId, companyId },
    });
    if (!member) throw new Error("Workforce member not found.");
    assertWorkforceStatusTransition(member.status, status);
    const terminating = status === "Terminated";
    const updated = await tx.employee.update({
      where: { id: member.id },
      data: {
        status,
        terminationDate: terminating ? new Date() : status === "Active" ? null : undefined,
        terminationReason: terminating ? clean(reason) : status === "Active" ? null : undefined,
      },
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId,
        eventType: "workforce.status_changed",
        entityType: "Employee",
        entityId: member.id,
        metadata: { from: member.status, to: status },
      },
    });
    return updated;
  });
}

export const activateWorkforceMember = (companyId: string, userId: string, employeeId: string) =>
  transitionWorkforceStatus(companyId, userId, employeeId, "Active");
export const suspendWorkforceMember = (companyId: string, userId: string, employeeId: string, reason?: string) =>
  transitionWorkforceStatus(companyId, userId, employeeId, "Suspended", reason);
export const placeWorkforceMemberOnLeave = (companyId: string, userId: string, employeeId: string) =>
  transitionWorkforceStatus(companyId, userId, employeeId, "Leave");
export const terminateWorkforceMember = (companyId: string, userId: string, employeeId: string, reason?: string) =>
  transitionWorkforceStatus(companyId, userId, employeeId, "Terminated", reason);
export const reactivateWorkforceMember = activateWorkforceMember;

export async function linkApplicationUser(
  companyId: string,
  actingUserId: string,
  employeeId: string,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const [member, membership, duplicate] = await Promise.all([
      tx.employee.findFirst({ where: { id: employeeId, companyId } }),
      tx.companyMembership.findFirst({
        where: { companyId, userId, status: "Active" },
      }),
      tx.employee.findFirst({ where: { companyId, userId } }),
    ]);
    if (!member || !membership) throw new Error("Workforce member or company user not found.");
    if (duplicate && duplicate.id !== member.id)
      throw new Error("Application user is already linked to a workforce member.");
    const updated = await tx.employee.update({
      where: { id: member.id },
      data: { userId, invitationStatus: "Accepted" },
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId,
        eventType: "workforce.application_access_linked",
        entityType: "Employee",
        entityId: member.id,
        metadata: { linkedUserId: userId },
      },
    });
    return updated;
  });
}

export async function unlinkApplicationUser(
  companyId: string,
  actingUserId: string,
  employeeId: string,
) {
  return prisma.$transaction(async (tx) => {
    const member = await tx.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!member) throw new Error("Workforce member not found.");
    const updated = await tx.employee.update({
      where: { id: member.id },
      data: { userId: null, invitationStatus: "Revoked" },
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId,
        eventType: "workforce.application_access_unlinked",
        entityType: "Employee",
        entityId: member.id,
      },
    });
    return updated;
  });
}

export async function addCompensationRecord(
  companyId: string,
  actingUserId: string,
  employeeId: string,
  input: {
    compensationType: CompensationType;
    hourlyRateCents?: number | null;
    annualSalaryCents?: number | null;
    commissionConfig?: Prisma.InputJsonValue;
    effectiveStartDate: Date;
    effectiveEndDate?: Date | null;
    overtimeEligible?: boolean;
    notes?: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    const member = await tx.employee.findFirst({ where: { id: employeeId, companyId }, select: { id: true } });
    if (!member) throw new Error("Workforce member not found.");
    const end = input.effectiveEndDate ?? null;
    if (end && end < input.effectiveStartDate) throw new Error("Compensation end date must follow its start date.");
    const overlap = await tx.workforceCompensation.findFirst({
      where: {
        companyId,
        employeeId,
        effectiveStartDate: { lte: end ?? new Date("9999-12-31") },
        OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: input.effectiveStartDate } }],
      },
    });
    if (overlap) throw new Error("Compensation dates overlap an existing record.");
    const record = await tx.workforceCompensation.create({
      data: {
        companyId,
        employeeId,
        createdByUserId: actingUserId,
        compensationType: input.compensationType,
        hourlyRateCents: input.hourlyRateCents ?? null,
        annualSalaryCents: input.annualSalaryCents ?? null,
        commissionConfig: input.commissionConfig,
        effectiveStartDate: input.effectiveStartDate,
        effectiveEndDate: end,
        overtimeEligible: Boolean(input.overtimeEligible),
        notes: clean(input.notes),
      },
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId,
        eventType: "workforce.compensation_added",
        entityType: "Employee",
        entityId: employeeId,
        metadata: { compensationType: input.compensationType, effectiveStartDate: input.effectiveStartDate.toISOString() },
      },
    });
    return record;
  }, { isolationLevel: "Serializable" });
}

export async function closeCompensationRecord(
  companyId: string,
  actingUserId: string,
  recordId: string,
  effectiveEndDate: Date,
) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.workforceCompensation.findFirst({ where: { id: recordId, companyId } });
    if (!record) throw new Error("Compensation record not found.");
    if (effectiveEndDate < record.effectiveStartDate) throw new Error("Compensation end date is invalid.");
    const updated = await tx.workforceCompensation.update({ where: { id: record.id }, data: { effectiveEndDate } });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "workforce.compensation_ended", entityType: "Employee", entityId: record.employeeId } });
    return updated;
  });
}

export async function addEmergencyContact(
  companyId: string,
  employeeId: string,
  input: { name: string; relationship: string; phone: string; alternatePhone?: string; priority: number; notes?: string },
) {
  if (!(await prisma.employee.findFirst({ where: { id: employeeId, companyId }, select: { id: true } })))
    throw new Error("Workforce member not found.");
  return prisma.workforceEmergencyContact.create({
    data: { companyId, employeeId, ...input, alternatePhone: clean(input.alternatePhone), notes: clean(input.notes) },
  });
}

export async function addCredential(
  companyId: string,
  actingUserId: string,
  employeeId: string,
  input: { type: string; title: string; identifier?: string; issuingOrganization?: string; issuedDate?: Date | null; expirationDate?: Date | null; status?: WorkforceCredentialStatus; notes?: string },
) {
  return prisma.$transaction(async (tx) => {
    if (!(await tx.employee.findFirst({ where: { id: employeeId, companyId }, select: { id: true } })))
      throw new Error("Workforce member not found.");
    const credential = await tx.workforceCredential.create({
      data: {
        companyId,
        employeeId,
        type: input.type.trim(),
        title: input.title.trim(),
        identifier: clean(input.identifier),
        issuingOrganization: clean(input.issuingOrganization),
        issuedDate: input.issuedDate ?? null,
        expirationDate: input.expirationDate ?? null,
        status: input.status ?? credentialStatus(input.expirationDate),
        notes: clean(input.notes),
      },
    });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "workforce.credential_added", entityType: "Employee", entityId: employeeId, metadata: { type: credential.type } } });
    return credential;
  });
}

export function credentialStatus(expirationDate?: Date | null, now = new Date()): WorkforceCredentialStatus {
  if (!expirationDate) return "Valid";
  if (expirationDate < now) return "Expired";
  if (expirationDate.getTime() <= now.getTime() + 30 * 86_400_000) return "ExpiringSoon";
  return "Valid";
}

export async function completeOnboardingItem(
  companyId: string,
  actingUserId: string,
  itemId: string,
  documentId?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.workforceOnboardingItem.findFirst({ where: { id: itemId, companyId } });
    if (!item) throw new Error("Onboarding item not found.");
    if (documentId && !(await tx.workforceDocument.findFirst({ where: { id: documentId, companyId, employeeId: item.employeeId } })))
      throw new Error("Onboarding document not found.");
    const updated = await tx.workforceOnboardingItem.update({
      where: { id: item.id },
      data: { status: "Completed", completedAt: new Date(), completedByUserId: actingUserId, documentId: documentId ?? null },
    });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "workforce.onboarding_completed", entityType: "Employee", entityId: item.employeeId, metadata: { itemId: item.id } } });
    return updated;
  });
}

export async function addOnboardingItem(
  companyId: string,
  employeeId: string,
  input: { title: string; category: string; required?: boolean; dueDate?: Date | null; notes?: string },
) {
  if (!(await prisma.employee.findFirst({ where: { id: employeeId, companyId }, select: { id: true } })))
    throw new Error("Workforce member not found.");
  return prisma.workforceOnboardingItem.create({
    data: { companyId, employeeId, title: input.title.trim(), category: input.category.trim(), required: input.required ?? true, dueDate: input.dueDate ?? null, notes: clean(input.notes) },
  });
}

export async function listWorkforceDirectory(companyId: string, input: WorkforceDirectoryInput = {}) {
  const search = input.search?.trim();
  const statuses = input.active === true ? ["Onboarding", "Active", "Leave"] as EmployeeStatus[] : input.active === false ? ["Suspended", "Terminated", "Inactive"] as EmployeeStatus[] : undefined;
  return prisma.employee.findMany({
    where: {
      companyId,
      ...(input.status ? { status: input.status } : statuses ? { status: { in: statuses } } : {}),
      ...(input.workerType ? { workerType: input.workerType } : {}),
      ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
      ...(search ? { OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { preferredName: { contains: search, mode: "insensitive" } },
        { employeeNumber: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: [{ status: "asc" }, { firstName: "asc" }],
    include: {
      defaultCrew: { select: { id: true, name: true } },
      onboardingItems: { select: { status: true, required: true } },
      workforceCredentials: { select: { status: true, expirationDate: true } },
    },
  });
}

export async function getWorkforceDetail(companyId: string, employeeId: string, includeCompensation: boolean) {
  return prisma.employee.findFirst({
    where: { id: employeeId, companyId },
    include: {
      user: { select: { id: true, email: true, active: true, memberships: { where: { companyId }, select: { role: true, status: true } } } },
      manager: { select: { id: true, firstName: true, lastName: true } },
      defaultCrew: { select: { id: true, name: true } },
      emergencyContacts: { orderBy: { priority: "asc" } },
      workforceCredentials: { orderBy: { expirationDate: "asc" } },
      workforceDocuments: { orderBy: { createdAt: "desc" } },
      onboardingItems: { orderBy: [{ status: "asc" }, { createdAt: "asc" }] },
      compensationHistory: includeCompensation ? { orderBy: { effectiveStartDate: "desc" } } : false,
      assignments: { where: { companyId }, select: { id: true, jobId: true, role: true, status: true, assignedAt: true } },
    },
  });
}

export async function getOnboardingStatus(companyId: string, employeeId: string) {
  const items = await prisma.workforceOnboardingItem.findMany({ where: { companyId, employeeId }, orderBy: { createdAt: "asc" } });
  const required = items.filter((item) => item.required);
  return { items, completed: required.filter((item) => item.status === "Completed").length, total: required.length };
}

export async function getExpiringCredentials(companyId: string, days = 30) {
  const now = new Date();
  return prisma.workforceCredential.findMany({
    where: { companyId, expirationDate: { gte: now, lte: new Date(now.getTime() + days * 86_400_000) } },
    orderBy: { expirationDate: "asc" },
    include: { employee: { select: { id: true, firstName: true, lastName: true } } },
  });
}

export async function listWorkforceOnboardingOverview(companyId: string) {
  return prisma.employee.findMany({
    where: { companyId, status: "Onboarding" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      preferredName: true,
      hireDate: true,
      onboardingItems: { select: { id: true, title: true, required: true, status: true, dueDate: true } },
    },
  });
}

export async function listLinkableCompanyUsers(companyId: string) {
  return prisma.user.findMany({
    where: { memberships: { some: { companyId, status: "Active" } }, employees: { none: { companyId } } },
    select: { id: true, email: true, firstName: true, lastName: true, memberships: { where: { companyId }, select: { role: true } } },
    orderBy: { email: "asc" },
  });
}

export async function getWorkforceFormOptions(companyId: string, excludeEmployeeId?: string) {
  const [managers, crews] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, id: excludeEmployeeId ? { not: excludeEmployeeId } : undefined, status: { in: ["Active", "Onboarding"] } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.crew.findMany({
      where: { companyId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { managers, crews };
}

export async function getWorkforceActivity(companyId: string, employeeId: string) {
  return prisma.auditEvent.findMany({
    where: { companyId, entityType: "Employee", entityId: employeeId, eventType: { startsWith: "workforce." } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actingUser: { select: { firstName: true, lastName: true, email: true } } },
  });
}

export type WorkforceDocumentMetadata = {
  category: WorkforceDocumentCategory;
  displayFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  effectiveDate?: Date | null;
  expirationDate?: Date | null;
  notes?: string;
};
