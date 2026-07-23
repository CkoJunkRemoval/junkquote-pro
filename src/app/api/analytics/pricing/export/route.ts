import { requireCompanyRole } from "@/lib/auth/tenant";
import { parsePricingIntelligenceFilters } from "@/lib/pricingIntelligence/filters";
import { getPricingIntelligence } from "@/lib/pricingIntelligence/service";
import { pricingIntelligenceRows,renderPricingIntelligenceCsv,renderPricingIntelligencePdf } from "@/lib/pricingIntelligence/export";
import { checkRateLimit,ratePolicies } from "@/lib/security/rateLimit";
import { AppError,safeErrorResponse } from "@/lib/errors/appError";
import { createRequestId } from "@/lib/observability/requestId";

export async function GET(request:Request){
  const requestId=createRequestId(request.headers.get("x-request-id"));
  try{
    const context=await requireCompanyRole("Owner","Admin","Office");
    if(!(await checkRateLimit(`pricing-intelligence-export:${context.companyId}:${context.user.id}`,ratePolicies.export)).allowed)throw new AppError("RATE_LIMITED","Too many export requests.");
    const url=new URL(request.url),raw=Object.fromEntries(url.searchParams),format=raw.format==="pdf"?"pdf":"csv";
    const data=await getPricingIntelligence(context.companyId,parsePricingIntelligenceFilters(raw)),rows=pricingIntelligenceRows(data);
    if(format==="pdf")return new Response(renderPricingIntelligencePdf(rows),{headers:{"x-request-id":requestId,"content-type":"application/pdf","content-disposition":'attachment; filename="pricing-intelligence.pdf"'}});
    return new Response(renderPricingIntelligenceCsv(rows),{headers:{"x-request-id":requestId,"content-type":"text/csv; charset=utf-8","content-disposition":'attachment; filename="pricing-intelligence.csv"'}});
  }catch(error){return safeErrorResponse(error,requestId);}
}
