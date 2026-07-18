"use server";

import { buildPublicEstimatePdf } from "@/data/output/buildPublicEstimatePdf";
import { renderEstimatePdf } from "@/data/output/renderEstimatePdf";
import { getEstimatePdfData } from "@/lib/estimates/getEstimatePdfData";
import { requireCompanyRole } from "@/lib/auth/tenant";
import{checkRateLimit,ratePolicies}from"@/lib/security/rateLimit";import{AppError}from"@/lib/errors/appError";

export async function downloadEstimatePdfAction(estimateId: string) {
  const c = await requireCompanyRole("Owner", "Admin", "Manager", "Office");if(!checkRateLimit(`pdf:${c.companyId}:${c.user.id}`,ratePolicies.pdf).allowed)throw new AppError("RATE_LIMITED","Too many PDF requests.");return renderEstimatePdf(buildPublicEstimatePdf(await getEstimatePdfData(c.companyId, estimateId)));
}
