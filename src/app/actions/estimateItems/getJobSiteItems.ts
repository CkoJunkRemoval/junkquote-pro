"use server";

import { getJobSiteItems } from "@/lib/estimateItems/getJobSiteItems";

export async function getJobSiteItemsAction(jobSiteId: string) {
  return getJobSiteItems(jobSiteId);
}
