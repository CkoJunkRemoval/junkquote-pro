import { requireTenantContext } from "@/lib/auth/tenant";
import { canAccessFeature } from "@/lib/billing/entitlements";
import { hasFinanceCapability } from "@/lib/finance/permissions";
import {
  exportFinanceCsv,
  type FinanceExportKind,
} from "@/lib/finance/service";

const kinds = new Set<FinanceExportKind>([
  "expenses",
  "allocations",
  "vendors",
  "categories",
  "documents",
  "recurring",
  "income",
  "job-costs",
  "periods",
  "revisions",
  "operational-sources",
  "asset-purchases",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const tenant = await requireTenantContext();
  if (!(await canAccessFeature(tenant.companyId, "advancedExports", tenant.role))) return Response.json({ error: { code: "UPGRADE_REQUIRED", message: "Upgrade to export Finance data." } }, { status: 403 });
  if (!hasFinanceCapability(tenant.role, "finance.exports"))
    return Response.json({ error: { code: "FORBIDDEN", message: "You do not have permission to use this feature." } }, { status: 403 });
  const { kind } = await params;
  if (!kinds.has(kind as FinanceExportKind))
    return new Response("Unsupported export", { status: 404 });
  const csv = await exportFinanceCsv(
    tenant.companyId,
    tenant.user.id,
    kind as FinanceExportKind,
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="junkquote-finance-${kind}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
