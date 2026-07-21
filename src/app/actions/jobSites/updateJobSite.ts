"use server";

import {
  updateJobSite,
  type UpdateJobSiteInput,
} from "@/lib/jobSites/updateJobSite";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function updateJobSiteAction(input: UpdateJobSiteInput) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return updateJobSite(companyId, input);
}
