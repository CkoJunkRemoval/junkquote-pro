"use server";

import { buildPublicEstimatePdf } from "@/data/output/buildPublicEstimatePdf";
import { renderEstimatePdf } from "@/data/output/renderEstimatePdf";
import { getSignedPublicEstimatePdf } from "@/lib/estimates/getSignedPublicEstimatePdf";

export async function downloadSignedPublicEstimatePdfAction(token: string) {
  return renderEstimatePdf(buildPublicEstimatePdf(await getSignedPublicEstimatePdf(token)));
}
