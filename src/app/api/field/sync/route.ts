import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant";
import { resolveFieldActor, syncFieldOperations } from "@/lib/fieldOperations/fieldOperations";

export async function POST(request:Request){try{const tenant=await requireTenantContext();const actor=await resolveFieldActor(tenant);const body=await request.json() as {operations:Parameters<typeof syncFieldOperations>[2]};return NextResponse.json({operations:await syncFieldOperations(tenant.companyId,actor,body.operations??[])});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to sync field operations."},{status:400});}}
