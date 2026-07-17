"use server";
import { getEstimatePdfData } from "@/lib/estimates/getEstimatePdfData";
import { requireCompanyRole } from "@/lib/auth/tenant";
export async function loadEstimatePdfDataAction(estimateId: string) { const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return getEstimatePdfData(companyId, estimateId); }
