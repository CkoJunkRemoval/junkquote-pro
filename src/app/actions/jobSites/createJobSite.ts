"use server";

import {
  createJobSite,
  type CreateJobSiteInput,
} from "@/lib/jobSites/createJobSite";

export async function createJobSiteAction(input: CreateJobSiteInput) {
  return createJobSite(input);
}
