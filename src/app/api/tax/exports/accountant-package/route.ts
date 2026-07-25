import { requireTenantContext } from "@/lib/auth/tenant";
import { requireTaxCapability } from "@/lib/tax/permissions";
import { createAccountantPackage } from "@/lib/tax/service";

export async function GET(request: Request) {
  const tenant = await requireTenantContext();
  requireTaxCapability(tenant.role, "tax.exports");
  const year = Number(new URL(request.url).searchParams.get("year") || new Date().getUTCFullYear());
  const archive = await createAccountantPackage(tenant.companyId, tenant.user.id, year);
  return new Response(archive, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="junkquote-tax-${year}-accountant-package.zip"`, "Cache-Control": "private, no-store" } });
}
