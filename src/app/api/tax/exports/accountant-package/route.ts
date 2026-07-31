import { requireTenantContext } from "@/lib/auth/tenant";
import { hasTaxCapability } from "@/lib/tax/permissions";
import { createAccountantPackage } from "@/lib/tax/service";
import { canAccessFeature } from "@/lib/billing/entitlements";

export async function GET(request: Request) {
  const tenant = await requireTenantContext();
  if (!(await canAccessFeature(tenant.companyId, "advancedExports"))) return Response.json({ error: { code: "UPGRADE_REQUIRED", message: "Upgrade to export the accountant package." } }, { status: 403 });
  if (!hasTaxCapability(tenant.role, "tax.exports"))
    return Response.json({ error: { code: "FORBIDDEN", message: "You do not have permission to use this feature." } }, { status: 403 });
  const year = Number(new URL(request.url).searchParams.get("year") || new Date().getUTCFullYear());
  const archive = await createAccountantPackage(tenant.companyId, tenant.user.id, year);
  return new Response(archive, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="junkquote-tax-${year}-accountant-package.zip"`, "Cache-Control": "private, no-store" } });
}
