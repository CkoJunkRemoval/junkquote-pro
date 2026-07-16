"use server";

import {
  updateJobSite,
  type UpdateJobSiteInput,
} from "@/lib/jobSites/updateJobSite";

export async function updateJobSiteAction(input: UpdateJobSiteInput) {
  return updateJobSite(input);
}
