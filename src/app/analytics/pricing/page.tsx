import AppLayout from "@/components/layout/AppLayout";
import PricingIntelligenceDashboard from "@/features/pricingIntelligence/PricingIntelligenceDashboard";
import { requireCompanyModulePage } from "@/lib/auth/pageAccess";
import { parsePricingIntelligenceFilters } from "@/lib/pricingIntelligence/filters";
import { getPricingIntelligence, getPricingIntelligenceOptions } from "@/lib/pricingIntelligence/service";

export default async function PricingIntelligencePage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const context=await requireCompanyModulePage("pricingIntelligence");
  const filters=parsePricingIntelligenceFilters(await searchParams);
  const [data,options]=await Promise.all([getPricingIntelligence(context.companyId,filters),getPricingIntelligenceOptions(context.companyId)]);
  return <AppLayout><PricingIntelligenceDashboard data={data} options={options} filters={filters}/></AppLayout>;
}
