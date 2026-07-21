"use server";

import { getJobSites } from "@/lib/jobSites/getJobSites";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function getJobSitesAction(estimateId: string) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return getJobSites(companyId, estimateId);
}
