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
  const { companyId, role } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return withDistributedLock("estimate-plan-limit", companyId, 30_000, async () => { await canCreateEstimate(companyId, new Date(), role); return createEstimate(companyId, input); });
}
