import {NextRequest,NextResponse} from "next/server";
import {requireCustomerPortalContext} from "@/lib/portal/context";
import {queryEstimateEvents} from "@/lib/estimates/estimateEvents";

export async function GET(request:NextRequest){const context=await requireCustomerPortalContext();const p=request.nextUrl.searchParams;return NextResponse.json(await queryEstimateEvents(context.companyId,{audience:"customer",customerId:context.customerId,estimateId:p.get("estimate")??undefined,cursor:p.get("cursor")??undefined,limit:Number(p.get("limit")??25)}))}
