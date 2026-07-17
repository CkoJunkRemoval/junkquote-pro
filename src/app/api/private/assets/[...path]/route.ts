import { AuthorizationError, requireTenantContext } from "@/lib/auth/tenant";
import { prisma } from "@/lib/prisma";
import { localCompanyLogoStorage } from "@/lib/storage/companyLogoStorage";
import { localJobPhotoStorage } from "@/lib/storage/jobPhotoStorage";

const safe = (value: string) => /^[a-zA-Z0-9_.-]+$/.test(value) && value !== "." && value !== "..";
function assetResponse(dataUrl: string | null) { if (!dataUrl) return new Response("Not found", { status: 404 }); const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl); if (!match) return new Response("Not found", { status: 404 }); return new Response(Buffer.from(match[2], "base64"), { headers: { "Content-Type": match[1], "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } }); }

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const context = await requireTenantContext();
    const segments = (await params).path;
    if (!segments.every(safe)) return new Response("Not found", { status: 404 });
    if (segments.length === 3 && segments[0] === "company-logos") {
      const [, companyId, fileName] = segments; if (companyId !== context.companyId) return new Response("Not found", { status: 404 });
      const fileUrl = `/api/private/assets/company-logos/${companyId}/${fileName}`;
      const company = await prisma.company.findFirst({ where: { id: companyId, logoUrl: fileUrl }, select: { id: true } });
      if (!company) return new Response("Not found", { status: 404 });
      return assetResponse(await localCompanyLogoStorage.readDataUrl(fileUrl));
    }
    if (segments.length === 4 && segments[0] === "job-photos") {
      const [, companyId, jobId, fileName] = segments; if (companyId !== context.companyId) return new Response("Not found", { status: 404 });
      const fileUrl = `/api/private/assets/job-photos/${companyId}/${jobId}/${fileName}`;
      const photo = await prisma.jobPhoto.findFirst({ where: { companyId, jobId, job: { companyId }, OR: [{ fileUrl }, { thumbnailUrl: fileUrl }] }, select: { id: true } });
      if (!photo) return new Response("Not found", { status: 404 });
      return assetResponse(await localJobPhotoStorage.readDataUrl(fileUrl));
    }
    return new Response("Not found", { status: 404 });
  } catch (error) {
    if (error instanceof AuthorizationError) return new Response("Unauthorized", { status: error.code === "FORBIDDEN" ? 403 : 401 });
    throw error;
  }
}
