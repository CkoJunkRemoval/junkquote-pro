"use server";

import { deleteJobSite } from "@/lib/jobSites/deleteJobSite";

export async function deleteJobSiteAction(id: string) {
  return deleteJobSite(id);
}
