"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CompanyClassification } from "@/generated/prisma/client";
import { requirePlatformAdmin } from "@/lib/admin/platformAuth";
import { changeCompanyClassification, deleteTestCompany, mutateManualTrial, setCompanySuspension } from "@/lib/admin/platformCompanyManagement";

const refresh = (id: string) => { revalidatePath("/platform-admin"); revalidatePath("/platform-admin/companies"); revalidatePath(`/platform-admin/companies/${id}`); };
export async function changeClassificationAction(companyId: string, form: FormData) { const actor = await requirePlatformAdmin("platform_admin.company_classification_mutation"); await changeCompanyClassification(actor.id, companyId, String(form.get("classification")) as CompanyClassification, String(form.get("reason") ?? "")); refresh(companyId); }
export async function trialAction(companyId: string, operation: "grant" | "extend" | "end", form: FormData) { const actor = await requirePlatformAdmin("platform_admin.company_trial_mutation"); const days = Number(form.get("days")); const custom = String(form.get("expiration") ?? ""); const expiration = operation === "end" ? null : custom ? new Date(`${custom}T23:59:59.999`) : new Date(Date.now() + days * 864e5); await mutateManualTrial(actor.id, companyId, operation, expiration, String(form.get("reason") ?? "")); refresh(companyId); }
export async function suspensionAction(companyId: string, suspended: boolean, form: FormData) { const actor = await requirePlatformAdmin("platform_admin.company_lifecycle_mutation"); await setCompanySuspension(actor.id, companyId, suspended, String(form.get("reason") ?? "")); refresh(companyId); }
export async function deleteTestCompanyAction(companyId: string, form: FormData) { const actor = await requirePlatformAdmin("platform_admin.test_company_deletion"); await deleteTestCompany(actor.id, companyId, String(form.get("confirmation") ?? ""), String(form.get("reason") ?? "")); revalidatePath("/platform-admin"); revalidatePath("/platform-admin/companies"); redirect("/platform-admin/companies"); }
