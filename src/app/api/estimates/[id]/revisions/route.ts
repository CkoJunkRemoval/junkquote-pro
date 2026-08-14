import { requireCompanyRole } from "@/lib/auth/tenant";
import { createEstimateRevision } from "@/lib/estimates/createEstimateRevision";
import { canCreateEstimate } from "@/lib/billing/entitlements";
import { withDistributedLock } from "@/lib/distributed/locks";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { companyId, role } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
    const revision = await withDistributedLock("estimate-plan-limit", companyId, 30_000, async () => { await canCreateEstimate(companyId, new Date(), role); return createEstimateRevision(companyId, (await context.params).id); });
    return Response.json({ revision }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create revision.";
    const status = message === "Estimate not found." ? 404 : message === "Only an approved estimate can be revised." ? 409 : 400;
    return Response.json({ error: { message } }, { status });
  }
}
