import PublicEstimateApproval from "@/features/estimate/public/PublicEstimateApproval";
import { getPublicEstimateByApprovalToken } from "@/lib/estimates/getPublicEstimateByApprovalToken";

export default async function ApprovalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
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
