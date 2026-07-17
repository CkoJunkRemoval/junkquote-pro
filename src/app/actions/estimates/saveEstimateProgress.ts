"use server";

import {
  saveEstimateProgress,
  type SaveEstimateProgressInput,
} from "@/lib/estimates/saveEstimateProgress";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function saveEstimateProgressAction(
  input: SaveEstimateProgressInput
) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return saveEstimateProgress(companyId, input);
}
