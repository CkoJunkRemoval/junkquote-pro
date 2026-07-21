import PublicEstimateApproval from "@/features/estimate/public/PublicEstimateApproval";
import { getPublicEstimateByApprovalToken } from "@/lib/estimates/getPublicEstimateByApprovalToken";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";

export default async function ApprovalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const tokenIdentity = createHash("sha256").update(token).digest("hex");
  if (!(await checkRateLimit(`public-estimate:ip:${ip}`, ratePolicies.publicEstimate)).allowed || !(await checkRateLimit(`public-estimate:token:${tokenIdentity}`, ratePolicies.publicEstimate)).allowed)
    return <main className="mx-auto max-w-2xl px-6 py-16"><p>Too many requests. Try again later.</p></main>;
  let estimate = null;
  let errorMessage: string | null = null;

  try {
    estimate = await getPublicEstimateByApprovalToken(token);
  } catch (error) {
    errorMessage = error instanceof Error
      ? error.message
      : "This approval link is invalid or has expired.";
  }

  if (!estimate) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-3xl font-bold text-red-900">Approval Link Unavailable</h1>
          <p className="mt-3 text-red-800">{errorMessage}</p>
        </div>
      </main>
    );
  }

  return <PublicEstimateApproval token={token} estimate={estimate} />;
}
