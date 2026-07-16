"use server";

import { getJobSites } from "@/lib/jobSites/getJobSites";

export async function getJobSitesAction(estimateId: string) {
  return getJobSites(estimateId);
}
