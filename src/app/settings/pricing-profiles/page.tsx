import AppLayout from "@/components/layout/AppLayout";
import PricingProfilesManagement from "@/features/pricingProfiles/PricingProfilesManagement";
import { requireTenantContext } from "@/lib/auth/tenant";
import { listPricingProfiles } from "@/lib/pricingProfiles/pricingProfiles";

export default async function PricingProfilesPage() {
  const context = await requireTenantContext();
  const profiles = await listPricingProfiles(context.companyId);
  const canManage = ["Owner", "Admin", "Office"].includes(context.role);
  return <AppLayout><PricingProfilesManagement initialProfiles={profiles} canManage={canManage} /></AppLayout>;
}
