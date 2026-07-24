import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant";
import { acknowledgeOfflineSync } from "@/lib/offlineField/server";

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext();
    const body = (await request.json()) as { packageId?: string; mutationIds?: string[] };
    if (!body.packageId || !Array.isArray(body.mutationIds))
      throw new Error("Package and mutation identifiers are required.");
    return NextResponse.json(
      await acknowledgeOfflineSync(context, body.packageId, body.mutationIds),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync acknowledgement failed." },
      { status: 400 },
    );
  }
}

