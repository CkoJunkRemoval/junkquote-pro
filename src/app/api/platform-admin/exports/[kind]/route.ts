import { requirePlatformAdmin } from "@/lib/admin/platformAuth";
import { csv, getActivationFunnel, getPlatformCompanies, getPlatformConversions, getPlatformSubscriptions, getPlatformUsage, platformRange } from "@/lib/admin/platformAnalytics";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";

const kinds = new Set(["companies", "activation", "usage", "subscriptions", "conversions"]);
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!kinds.has(kind)) return new Response("Not found", { status: 404 });
  let admin;
  try {
    admin = await requirePlatformAdmin(`platform_admin.export_${kind}`);
  } catch {
    return Response.json({ error: "Platform administrator access is required." }, { status: 403 });
  }
  if (!(await checkRateLimit(`platform-admin-export:${admin.id}`, ratePolicies.export)).allowed)
    return Response.json({ error: "Too many exports. Try again later." }, { status: 429 });
  let body = "";
  if (kind === "companies") body = csv((await getPlatformCompanies()).map((x) => ({
    companyName: x.name, signupDate: x.createdAt.toISOString(), plan: x.subscription?.plan,
    subscriptionStatus: x.subscription?.status, seats: x.seatUsage, onboardingCompleted: Boolean(x.onboarding?.completedAt),
    activationStage: x.activationStage, users: x._count.users, estimates: x._count.estimates, jobs: x._count.jobs,
    invoices: x._count.invoices, lastActivity: x.lastActivity?.toISOString(), trialExpiration: x.subscription?.trialEnd?.toISOString(), accountActive: x.active,
  })));
  if (kind === "activation") body = csv(await getActivationFunnel());
  if (kind === "usage") { const x = await getPlatformUsage(); body = csv(x.daily); }
  if (kind === "subscriptions") { const x = await getPlatformSubscriptions(); body = csv([...x.statuses.map((r) => ({ dimension: "status", ...r })), ...x.plans.map((r) => ({ dimension: "plan", ...r }))]); }
  if (kind === "conversions") {
    const x = await getPlatformConversions(platformRange("all"));
    body = csv([{ created: x.created, sent: x.sent, viewed: x.viewed, approved: x.approved, rejected: x.rejected, approvalRate: x.approvalRate, medianSentToApprovedHours: x.medianSentToApprovedHours, estimateToJobRate: x.estimateToJobRate, invoiceToPaymentRate: x.invoiceToPaymentRate, approvalDenominator: x.denominators.approval, estimateToJobDenominator: x.denominators.estimateToJob, invoiceToPaymentDenominator: x.denominators.invoiceToPayment }]);
  }
  return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="junkquote-platform-${kind}.csv"`, "Cache-Control": "private, no-store" } });
}
