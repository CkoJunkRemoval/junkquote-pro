import AppLayout from "@/components/layout/AppLayout";
import FleetWorkspace from "@/features/fleet/FleetWorkspace";
import { requireTenantContext } from "@/lib/auth/tenant";
import { requireFleetCapability } from "@/lib/fleet/permissions";
export default async function Page() {
  const tenant = await requireTenantContext();
  requireFleetCapability(tenant.role, "fleet.documents.view");
  return (
    <AppLayout>
      <FleetWorkspace companyId={tenant.companyId} view="documents" />
    </AppLayout>
  );
}
