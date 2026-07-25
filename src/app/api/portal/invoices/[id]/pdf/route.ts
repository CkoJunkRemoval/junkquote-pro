import { NextResponse } from "next/server";
import { renderInvoicePdf } from "@/data/output/renderInvoicePdf";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
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
    const invoice = await prisma.invoice.findFirst({
      where: { id, companyId: context.companyId, customerId: context.customerId },
      select: { id: true },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    const detail = await getInvoiceDetail(context.companyId, id);
    if (!detail) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    const base64 = await renderInvoicePdf(detail);
    return new Response(Buffer.from(base64, "base64"), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="invoice-${id}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invoice PDF unavailable." }, { status: 401 });
  }
}
