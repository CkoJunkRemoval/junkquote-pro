import { requireTenantContext } from "@/lib/auth/tenant";
import { hasWorkforceCapability } from "@/lib/workforce/permissions";
import { requireTimeCapability } from "@/lib/timekeeping/permissions";
import { exportApprovedTimeCsv } from "@/lib/timekeeping/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params,
    c = await requireTenantContext();
  requireTimeCapability(c.role, "time.export");
  const csv = await exportApprovedTimeCsv(
    c.companyId,
    c.user.id,
    id,
    hasWorkforceCapability(c.role, "workforce.compensation.view"),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pay-period-${id}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
