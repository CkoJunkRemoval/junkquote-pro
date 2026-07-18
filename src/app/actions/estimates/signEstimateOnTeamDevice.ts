"use server";
import { signEstimateOnTeamDevice } from "@/lib/estimates/signEstimateOnTeamDevice";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { recordAuditEvent } from "@/lib/audit/audit";
import { currentRequestId } from "@/lib/audit/requestAudit";
export async function signEstimateOnTeamDeviceAction(
  estimateId: string,
  signerName: string,
  signatureData: string,
) {
  const c = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  const result = await signEstimateOnTeamDevice(
    c.companyId,
    estimateId,
    signerName,
    signatureData,
  );
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "estimate.approved",
    entityType: "Estimate",
    entityId: estimateId,
    requestId: await currentRequestId(),
    metadata: { signatureMethod: "TeamDevice" },
  });
  return result;
}
