"use server";

import { revalidatePath } from "next/cache";
import { requireAdminTenant } from "@/lib/auth/tenant";
import { prisma } from "@/lib/prisma";
import {
  createBusinessLocation,
  createServiceArea,
} from "@/lib/companyHub/service";
import { recordAuditEvent } from "@/lib/audit/audit";

const entries = (formData: FormData) =>
  Object.fromEntries(formData.entries()) as Record<string, FormDataEntryValue>;
const refresh = () => revalidatePath("/settings/company", "layout");

export async function createLocationAction(formData: FormData) {
  const context = await requireAdminTenant();
  const location = await createBusinessLocation(
    context.companyId,
    entries(formData),
  );
  await audit(context, "company.location.created", "BusinessLocation", location.id);
  refresh();
}

export async function setLocationActiveAction(formData: FormData) {
  const context = await requireAdminTenant();
  const id = String(formData.get("id") ?? "");
  await prisma.businessLocation.updateMany({
    where: { id, companyId: context.companyId },
    data: { active: formData.get("active") === "true" },
  });
  await audit(context, "company.location.status_updated", "BusinessLocation", id);
  refresh();
}

export async function createServiceAreaAction(formData: FormData) {
  const context = await requireAdminTenant();
  const area = await createServiceArea(context.companyId, entries(formData));
  await audit(context, "company.service_area.created", "ServiceAreaRule", area.id);
  refresh();
}

export async function uploadCompanyDocumentAction(formData: FormData) {
  void formData;
  await requireAdminTenant();
  throw new Error(
    "Company document uploads are disabled until authenticated tenant-authorized delivery is available.",
  );
}

export async function updateHubSettingsAction(formData: FormData) {
  const context = await requireAdminTenant();
  const group = String(formData.get("group") ?? "");
  const allowed = new Set([
    "operationalDefaults",
    "notificationPreferences",
    "integrationSettings",
  ]);
  if (!allowed.has(group)) throw new Error("Invalid settings group.");
  const value = Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => key !== "group")
      .map(([key, field]) => [key, field === "on" ? true : String(field)]),
  );
  await prisma.companySettings.upsert({
    where: { companyId: context.companyId },
    create: { companyId: context.companyId, [group]: value },
    update: { [group]: value },
  });
  await audit(context, "company.defaults.updated", "CompanySettings", context.companyId);
  refresh();
}

async function audit(
  context: Awaited<ReturnType<typeof requireAdminTenant>>,
  eventType: string,
  entityType: string,
  entityId: string,
) {
  await recordAuditEvent({
    companyId: context.companyId,
    actingUserId: context.user.id,
    eventType,
    entityType,
    entityId,
  });
}
