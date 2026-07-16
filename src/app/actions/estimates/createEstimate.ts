"use server";

import {
  createEstimate,
  type CreateEstimateInput,
} from "@/lib/estimates/createEstimate";

export async function createEstimateAction(
  input: CreateEstimateInput
) {
  return createEstimate(input);
}
