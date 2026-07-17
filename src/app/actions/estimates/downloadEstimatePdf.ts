"use server";

import { buildPublicEstimatePdf } from "@/data/output/buildPublicEstimatePdf";
import { renderEstimatePdf } from "@/data/output/renderEstimatePdf";
import { getEstimatePdfData } from "@/lib/estimates/getEstimatePdfData";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function downloadEstimatePdfAction(estimateId: string) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return renderEstimatePdf(buildPublicEstimatePdf(await getEstimatePdfData(companyId, estimateId)));
}
