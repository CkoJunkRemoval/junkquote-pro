import { getPublicEstimateByApprovalToken } from "./getPublicEstimateByApprovalToken";
import { getSignedPdfError } from "./signedPdfAccess";

export async function getSignedPublicEstimatePdf(token: string) {
  const estimate = await getPublicEstimateByApprovalToken(token);
  const error = getSignedPdfError(estimate.status, Boolean(estimate.signature));
  if (error) throw new Error(error);
  return estimate;
}
