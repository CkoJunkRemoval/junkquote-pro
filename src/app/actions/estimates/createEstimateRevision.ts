"use server";

import { requireCompanyRole } from "@/lib/auth/tenant";
import { createEstimateRevision } from "@/lib/estimates/createEstimateRevision";
import { canCreateEstimate } from "@/lib/billing/entitlements";
import { withDistributedLock } from "@/lib/distributed/locks";

export async function createEstimateRevisionAction(estimateId: string) {
  const { companyId, role } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return withDistributedLock("estimate-plan-limit", companyId, 30_000, async () => { await canCreateEstimate(companyId, new Date(), role); return createEstimateRevision(companyId, estimateId); });
}
