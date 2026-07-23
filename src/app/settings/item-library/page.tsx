import AppLayout from "@/components/layout/AppLayout";
import ItemLibraryManagement from "@/features/itemLibrary/ItemLibraryManagement";
import { requireTenantContext } from "@/lib/auth/tenant";
import { listItemLibrary } from "@/lib/itemLibrary/itemLibrary";
import { getActivePricingProfiles } from "@/lib/pricingProfiles/pricingProfiles";

export default async function ItemLibraryPage() {
  const context = await requireTenantContext();
  const [initialData, profiles] = await Promise.all([
    listItemLibrary(context.companyId, { active: true }),
    getActivePricingProfiles(context.companyId),
  ]);
  return <AppLayout><ItemLibraryManagement initialData={initialData} profiles={profiles} canManage={["Owner", "Admin", "Office"].includes(context.role)} /></AppLayout>;
}
