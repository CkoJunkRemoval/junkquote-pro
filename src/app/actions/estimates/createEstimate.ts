"use server";

import {
  createEstimate,
  type CreateEstimateInput,
} from "@/lib/estimates/createEstimate";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function createEstimateAction(
  input: CreateEstimateInput
) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return createEstimate(companyId, input);
}
