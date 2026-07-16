export function getSignedPdfError(status: string | null, hasSignature: boolean, tokenError: string | null = null) {
  if (tokenError) return tokenError;
  if (status === "Declined") return "This estimate is no longer available for approval.";
  if (status !== "Approved" || !hasSignature) return "A signed estimate is not available for this link.";
  return null;
}
