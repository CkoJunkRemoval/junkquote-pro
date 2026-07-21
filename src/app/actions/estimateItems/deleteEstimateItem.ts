"use server";

import { deleteEstimateItem } from "@/lib/estimateItems/deleteEstimateItem";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function deleteEstimateItemAction(id: string) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return deleteEstimateItem(companyId, id);
}
