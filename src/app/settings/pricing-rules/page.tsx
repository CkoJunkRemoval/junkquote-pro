import AppLayout from "@/components/layout/AppLayout";
import PricingRulesManagement from "@/features/pricingRules/PricingRulesManagement";
import { requireTenantContext } from "@/lib/auth/tenant";
import { listPricingRules } from "@/lib/pricingRules/pricingRules";
import { getActivePricingProfiles } from "@/lib/pricingProfiles/pricingProfiles";

export default async function PricingRulesPage(){
  const context=await requireTenantContext();
  const [rules,profiles]=await Promise.all([listPricingRules(context.companyId),getActivePricingProfiles(context.companyId)]);
  return <AppLayout><PricingRulesManagement initialRules={rules} profiles={profiles} canManage={["Owner","Admin","Office"].includes(context.role)}/></AppLayout>;
}
