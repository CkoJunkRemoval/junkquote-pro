import { NextResponse } from "next/server";
import { buildPublicEstimatePdf } from "@/data/output/buildPublicEstimatePdf";
import { renderEstimatePdf } from "@/data/output/renderEstimatePdf";
import { getEstimatePdfData } from "@/lib/estimates/getEstimatePdfData";
import { prisma } from "@/lib/prisma";
import { requireCustomerPortalContext } from "@/lib/portal/context";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireCustomerPortalContext();
    const { id } = await params;
    if (!(await checkRateLimit(`portal-pdf:${context.portalAccess.id}`, ratePolicies.pdf)).allowed) {
      return NextResponse.json({ error: "Too many PDF requests. Try again later." }, { status: 429 });
    }
    const estimate = await prisma.estimate.findFirst({
      where: { id, companyId: context.companyId, customerId: context.customerId },
      select: { id: true },
    });
    if (!estimate) return NextResponse.json({ error: "Estimate not found." }, { status: 404 });
    const base64 = await renderEstimatePdf(buildPublicEstimatePdf(await getEstimatePdfData(context.companyId, id)));
    return new Response(Buffer.from(base64, "base64"), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="estimate-${id}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Estimate PDF unavailable." }, { status: 401 });
  }
}
