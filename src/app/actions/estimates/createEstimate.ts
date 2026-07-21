"use server";

import {
  createEstimate,
  type CreateEstimateInput,
} from "@/lib/estimates/createEstimate";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { canCreateEstimate } from "@/lib/billing/entitlements";

export async function createEstimateAction(
  input: CreateEstimateInput
) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); await canCreateEstimate(companyId); return createEstimate(companyId, input);
}
