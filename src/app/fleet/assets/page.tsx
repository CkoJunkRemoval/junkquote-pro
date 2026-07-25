import AppLayout from "@/components/layout/AppLayout";
import FleetWorkspace from "@/features/fleet/FleetWorkspace";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireFleetCapability } from "@/lib/fleet/permissions";
import type { AssetCondition, FleetAssetStatus } from "@/generated/prisma/client";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    condition?: string;
    assigned?: string;
  }>;
}) {
  const tenant = await requireTenantContext();
  requireFleetCapability(tenant.role, "fleet.view");
  const filters = await searchParams;
  return (
    <AppLayout>
      <FleetWorkspace
        companyId={tenant.companyId}
        view="assets"
        search={filters.search}
        status={filters.status as FleetAssetStatus | undefined}
        condition={filters.condition as AssetCondition | undefined}
        assigned={
          filters.assigned === undefined || filters.assigned === ""
            ? undefined
            : filters.assigned === "true"
        }
      />
    </AppLayout>
  );
}
