"use server";

import {
  updateEstimateItem,
  type UpdateEstimateItemInput,
} from "@/lib/estimateItems/updateEstimateItem";

export async function updateEstimateItemAction(
  input: UpdateEstimateItemInput
) {
  return updateEstimateItem(input);
}
