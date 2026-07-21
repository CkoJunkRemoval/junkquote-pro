"use server";

import { deleteJobSite } from "@/lib/jobSites/deleteJobSite";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function deleteJobSiteAction(id: string) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return deleteJobSite(companyId, id);
}
