"use server";
import { listEstimates, type ListEstimatesInput } from "@/lib/estimates/listEstimates";
import { requireCompanyRole } from "@/lib/auth/tenant";
export async function listEstimatesAction(input: ListEstimatesInput = {}) { const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return listEstimates(companyId, input); }
