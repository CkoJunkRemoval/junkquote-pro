import { requireCompanyRole } from "@/lib/auth/tenant";
import { createEstimateRevision } from "@/lib/estimates/createEstimateRevision";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
    const revision = await createEstimateRevision(companyId, (await context.params).id);
    return Response.json({ revision }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create revision.";
    const status = message === "Estimate not found." ? 404 : message === "Only an approved estimate can be revised." ? 409 : 400;
    return Response.json({ error: { message } }, { status });
  }
}
