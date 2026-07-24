import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant";
import { pushOfflineMutationBatch } from "@/lib/offlineField/server";

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext();
    const body = (await request.json()) as { mutations?: unknown[] };
    const results = await pushOfflineMutationBatch(context, body.mutations ?? []);
    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Offline sync failed." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}

