import { requireTenantContext } from "@/lib/auth/tenant";
import { prisma } from "@/lib/prisma";
import { hasTaxCapability } from "@/lib/tax/permissions";
import { getTaxDocument } from "@/lib/tax/service";
import { readTaxDocument } from "@/lib/storage/taxDocumentStorage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenantContext();
  if (!hasTaxCapability(tenant.role, "tax.documents.view"))
    return Response.json({ error: { code: "FORBIDDEN", message: "You do not have permission to use this feature." } }, { status: 403 });
  const document = await getTaxDocument(tenant.companyId, (await params).id);
  if (!document) return new Response("Not found", { status: 404 });
  const stored = await readTaxDocument(document.storageKey);
  if (!stored) return new Response("Stored document not found", { status: 404 });
  await prisma.auditEvent.create({ data: { companyId: tenant.companyId, actingUserId: tenant.user.id, eventType: "tax.document.accessed", entityType: "TaxDocument", entityId: document.id } });
  return new Response(new Uint8Array(stored.data), { headers: { "Content-Type": document.mimeType, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.originalFilename)}`, "Cache-Control": "private, no-store" } });
}
