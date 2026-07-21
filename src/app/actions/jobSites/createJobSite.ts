"use server";

import {
  createJobSite,
  type CreateJobSiteInput,
} from "@/lib/jobSites/createJobSite";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function createJobSiteAction(input: CreateJobSiteInput) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return createJobSite(companyId, input);
}
