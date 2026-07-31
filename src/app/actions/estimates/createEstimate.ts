"use server";

import {
  createEstimate,
  type CreateEstimateInput,
} from "@/lib/estimates/createEstimate";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { canCreateEstimate } from "@/lib/billing/entitlements";
import { withDistributedLock } from "@/lib/distributed/locks";

export async function createEstimateAction(
  input: CreateEstimateInput
) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return withDistributedLock("estimate-plan-limit", companyId, 30_000, async () => { await canCreateEstimate(companyId); return createEstimate(companyId, input); });
}
