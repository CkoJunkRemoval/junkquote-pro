"use server";

import {
  updateEstimateItem,
  type UpdateEstimateItemInput,
} from "@/lib/estimateItems/updateEstimateItem";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function updateEstimateItemAction(
  input: UpdateEstimateItemInput
) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return updateEstimateItem(companyId, input);
}
