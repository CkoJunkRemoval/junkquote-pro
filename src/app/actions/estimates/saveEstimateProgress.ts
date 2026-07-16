"use server";

import {
  saveEstimateProgress,
  type SaveEstimateProgressInput,
} from "@/lib/estimates/saveEstimateProgress";

export async function saveEstimateProgressAction(
  input: SaveEstimateProgressInput
) {
  return saveEstimateProgress(input);
}
