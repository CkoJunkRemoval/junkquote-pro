"use server";

import { getJobSiteItems } from "@/lib/estimateItems/getJobSiteItems";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function getJobSiteItemsAction(jobSiteId: string) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return getJobSiteItems(companyId, jobSiteId);
}
