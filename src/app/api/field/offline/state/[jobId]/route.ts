import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant";
import { getAuthoritativeOfflineJob } from "@/lib/offlineField/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const context = await requireTenantContext();
    const { jobId } = await params;
    return NextResponse.json(await getAuthoritativeOfflineJob(context, jobId), {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Job is unavailable." },
      { status: 403 },
    );
  }
}

