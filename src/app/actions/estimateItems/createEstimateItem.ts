"use server";

import {
  createEstimateItem,
  type CreateEstimateItemInput,
} from "@/lib/estimateItems/createEstimateItem";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function createEstimateItemAction(
  input: CreateEstimateItemInput
) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return createEstimateItem(companyId, input);
}
