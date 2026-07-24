import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant";
import { uploadOfflineFieldPhoto } from "@/lib/offlineField/server";

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Photo file is required.");
    const category = String(form.get("category") ?? "During");
    if (!["Before", "During", "After", "Damage", "AdditionalItems", "Receipt"].includes(category))
      throw new Error("Photo category is invalid.");
    const result = await uploadOfflineFieldPhoto(context, {
      packageId: String(form.get("packageId") ?? ""),
      jobId: String(form.get("jobId") ?? ""),
      localMutationId: String(form.get("localMutationId") ?? ""),
      idempotencyKey: String(form.get("idempotencyKey") ?? ""),
      file,
      category: category as "Before" | "During" | "After" | "Damage" | "AdditionalItems" | "Receipt",
      caption: String(form.get("caption") ?? ""),
      capturedAtDevice: String(form.get("capturedAtDevice") ?? "") || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Photo upload failed." },
      { status: 400 },
    );
  }
}

