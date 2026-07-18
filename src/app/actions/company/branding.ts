"use server";

import { requireAdminTenant, requireTenantContext } from "@/lib/auth/tenant";
import {
  getCompanyBranding as getBranding,
  removeCompanyLogo,
  updateCompanyBranding,
  uploadCompanyLogo,
  type CompanySettingsInput,
} from "@/lib/company/branding";
import { recordAuditEvent } from "@/lib/audit/audit";
import { currentRequestId } from "@/lib/audit/requestAudit";

async function readableCompanyId() {
  return (await requireTenantContext()).companyId;
}

export async function getCompanyBranding() {
  return getBranding(await readableCompanyId());
}
export async function updateCompanyBrandingAction(input: CompanySettingsInput) {
  const c = await requireAdminTenant();
  const result = await updateCompanyBranding(c.companyId, input);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "company.settings.updated",
    entityType: "Company",
    entityId: c.companyId,
    requestId: await currentRequestId(),
    metadata: { fields: Object.keys(input) },
  });
  return result;
}
export async function uploadCompanyLogoAction(file: File) {
  const c = await requireAdminTenant();
  const result = await uploadCompanyLogo(c.companyId, file);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "company.logo_updated",
    entityType: "Company",
    entityId: c.companyId,
    requestId: await currentRequestId(),
  });
  return result;
}
export async function removeCompanyLogoAction() {
  const c = await requireAdminTenant();
  const result = await removeCompanyLogo(c.companyId);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "company.logo_removed",
    entityType: "Company",
    entityId: c.companyId,
    requestId: await currentRequestId(),
  });
  return result;
}
