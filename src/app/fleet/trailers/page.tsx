import AppLayout from "@/components/layout/AppLayout";
import FleetWorkspace from "@/features/fleet/FleetWorkspace";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireFleetCapability } from "@/lib/fleet/permissions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const tenant = await requireTenantContext();
  requireFleetCapability(tenant.role, "fleet.view");
  return (
    <AppLayout>
      <FleetWorkspace
        companyId={tenant.companyId}
        view="trailers"
        search={(await searchParams).search}
      />
    </AppLayout>
  );
}
