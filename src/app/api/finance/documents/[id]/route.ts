import { requireTenantContext } from "@/lib/auth/tenant";
import { requireFinanceCapability } from "@/lib/finance/permissions";
import { getFinanceDocumentAccess } from "@/lib/finance/service";
import { prisma } from "@/lib/prisma";
import { readFinanceDocument } from "@/lib/storage/financeDocumentStorage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenant = await requireTenantContext();
  requireFinanceCapability(tenant.role, "finance.receipts.view");
  const document = await getFinanceDocumentAccess(
    tenant.companyId,
    (await params).id,
  );
  if (!document) return new Response("Not found", { status: 404 });
  const object = await readFinanceDocument(document.storageKey);
  if (!object) return new Response("Stored document not found", { status: 404 });
  await prisma.auditEvent.create({
    data: {
      companyId: tenant.companyId,
      actingUserId: tenant.user.id,
      eventType: "finance.document.accessed",
      entityType: "FinanceDocument",
      entityId: document.id,
    },
  });
  return new Response(new Uint8Array(object.data), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.originalFilename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
