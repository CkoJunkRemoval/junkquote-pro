import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant";
import { revokeOfflinePackage } from "@/lib/offlineField/server";

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext();
    const body = (await request.json()) as { packageId?: string; reason?: string };
    if (!body.packageId) throw new Error("Package identifier is required.");
    return NextResponse.json(
      await revokeOfflinePackage(context, body.packageId, body.reason),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Package could not be revoked." },
      { status: 400 },
    );
  }
}

