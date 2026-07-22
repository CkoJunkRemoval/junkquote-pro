import {NextRequest,NextResponse} from "next/server";
import {EstimateEventCategory} from "@/generated/prisma/client";
import {requireTenantContext} from "@/lib/auth/tenant";
import {activityDateRange,queryEstimateEvents} from "@/lib/estimates/estimateEvents";

export async function GET(request:NextRequest){
  const context=await requireTenantContext();const p=request.nextUrl.searchParams;const range=activityDateRange((p.get("date")??"all") as "today"|"yesterday"|"last7"|"month"|"all");const rawCategory=p.get("category");
  const category=rawCategory&&Object.values(EstimateEventCategory).includes(rawCategory as EstimateEventCategory)?rawCategory as EstimateEventCategory:undefined;
  const result=await queryEstimateEvents(context.companyId,{audience:context.user.platformAdmin?"platformAdmin":"employee",actorId:p.get("user")??undefined,category,...range,customerId:p.get("customer")??undefined,estimateId:p.get("estimate")??undefined,jobId:p.get("job")??undefined,search:p.get("search")??undefined,cursor:p.get("cursor")??undefined,limit:Number(p.get("limit")??25)});
  return NextResponse.json(result);
}
