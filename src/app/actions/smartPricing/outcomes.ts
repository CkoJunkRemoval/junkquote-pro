"use server";
import { requireCompanyRole } from "@/lib/auth/tenant";
import {
  rebuildPricingOutcomes,
  syncPricingOutcomeForJob,
} from "@/lib/smartPricing/outcomes";
import { recordAuditEvent } from "@/lib/audit/audit";
import { currentRequestId } from "@/lib/audit/requestAudit";
export async function syncPricingOutcomeForJobAction(jobId: string) {
  const { companyId } = await requireCompanyRole(
    "Owner",
    "Admin",
    "Manager",
    "Office",
  );
  return syncPricingOutcomeForJob(companyId, jobId);
}
export async function rebuildPricingOutcomesAction(
  options: { from?: Date; to?: Date; limit?: number } = {},
) {
  const c = await requireCompanyRole("Owner", "Admin");
  const result = await rebuildPricingOutcomes(c.companyId, options);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "pricing_outcomes.rebuilt",
    entityType: "PricingOutcome",
    requestId: await currentRequestId(),
    metadata: {
      from: options.from?.toISOString(),
      to: options.to?.toISOString(),
      limit: options.limit,
    },
  });
  return result;
}
