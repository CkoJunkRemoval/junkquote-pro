"use server";

import {
  createEstimateItem,
  type CreateEstimateItemInput,
} from "@/lib/estimateItems/createEstimateItem";

export async function createEstimateItemAction(
  input: CreateEstimateItemInput
) {
  return createEstimateItem(input);
}
