import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant";

export async function GET() {
  try {
    const context = await requireTenantContext();
    return NextResponse.json(
      { reachable: true, companyId: context.companyId, userId: context.user.id, serverTime: new Date() },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch {
    return NextResponse.json({ reachable: false }, { status: 401 });
  }
}

