"use server";

import { deleteEstimateItem } from "@/lib/estimateItems/deleteEstimateItem";

export async function deleteEstimateItemAction(id: string) {
  return deleteEstimateItem(id);
}
