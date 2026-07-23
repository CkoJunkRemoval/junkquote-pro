import { AuthorizationError, requireTenantContext } from "@/lib/auth/tenant";
import { getCustomerPortalContext } from "@/lib/portal/context";
import { prisma } from "@/lib/prisma";
import { localCompanyLogoStorage } from "@/lib/storage/companyLogoStorage";
import { localJobPhotoStorage } from "@/lib/storage/jobPhotoStorage";
import { createRequestId } from "@/lib/observability/requestId";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import { logger } from "@/lib/observability/logger";

const logoDiagnostics = process.env.LOGO_DIAGNOSTICS_ENABLED === "true";
const logoLog = (
  stage: string,
  requestId: string,
  context: Record<string, unknown>,
) => {
  if (logoDiagnostics)
    logger.info("company_logo.read", { stage, requestId, ...context });
};

const safe = (value: string) =>
  /^[a-zA-Z0-9_.-]+$/.test(value) && value !== "." && value !== "..";
function assetResponse(dataUrl: string | null) {
  if (!dataUrl) return new Response("Not found", { status: 404 });
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return new Response("Not found", { status: 404 });
  const bytes = Buffer.from(match[2], "base64");
  return new Response(bytes, {
    headers: {
      "Content-Type": match[1],
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const requestId = createRequestId(_request.headers.get("x-request-id"));
  const identity =
    _request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";
  if (
    !(
      await checkRateLimit(
        `private-asset:${identity}`,
        ratePolicies.privateAsset,
      )
    ).allowed
  )
    return new Response("Too many requests", {
      status: 429,
      headers: { "x-request-id": requestId },
    });
  const segments = (await params).path;
  if (!segments.every(safe)) return new Response("Not found", { status: 404 });
  let staffCompanyId: string | null = null;
  try {
    staffCompanyId = (await requireTenantContext()).companyId;
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;
  }
  const portal = staffCompanyId ? null : await getCustomerPortalContext();
  const companyId = staffCompanyId ?? portal?.companyId;
  if (!companyId) {
    logoLog("authorization", requestId, { authorized: false });
    return new Response("Unauthorized", { status: 401 });
  }
  if (segments.length === 3 && segments[0] === "company-logos") {
    const [, assetCompanyId, fileName] = segments;
    if (assetCompanyId !== companyId) {
      logoLog("authorization", requestId, {
        authorized: false,
        tenantMatch: false,
      });
      return new Response("Not found", { status: 404 });
    }
    logoLog("authorization", requestId, {
      authorized: true,
      tenantMatch: true,
    });
    const fileUrl = `/api/private/assets/company-logos/${assetCompanyId}/${fileName}`;
    const company = await prisma.company.findFirst({
      where: { id: assetCompanyId, logoUrl: fileUrl },
      select: { id: true },
    });
    if (!company) {
      logoLog("database", requestId, {
        logoFieldPresent: false,
        pathClassification: "missing-or-stale",
      });
      return new Response("Not found", { status: 404 });
    }
    logoLog("database", requestId, {
      logoFieldPresent: true,
      pathClassification: "stable-private-path",
    });
    if (logoDiagnostics) {
      const metadata = await localCompanyLogoStorage
        .metadata(fileUrl)
        .catch(() => null);
      logoLog("storage", requestId, {
        objectFound: Boolean(metadata),
        mimeType: metadata?.contentType ?? null,
        fileSize: metadata?.size ?? null,
      });
    }
    const signedUrl = await localCompanyLogoStorage.createReadUrl(fileUrl);
    logoLog("signed-url", requestId, { generated: Boolean(signedUrl) });
    if (signedUrl) {
      logoLog("response", requestId, {
        status: 307,
        responseMode: "signed-redirect",
      });
      return new Response(null, {
        status: 307,
        headers: {
          Location: signedUrl,
          "Cache-Control": "private, no-store, max-age=0",
        },
      });
    }
    const response = assetResponse(
      await localCompanyLogoStorage.readDataUrl(fileUrl),
    );
    logoLog("response", requestId, {
      status: response.status,
      responseMode: "private-byte-stream",
      contentType: response.headers.get("content-type"),
    });
    return response;
  }
  if (segments.length === 4 && segments[0] === "job-photos") {
    const [, assetCompanyId, jobId, fileName] = segments;
    if (assetCompanyId !== companyId)
      return new Response("Not found", { status: 404 });
    const fileUrl = `/api/private/assets/job-photos/${assetCompanyId}/${jobId}/${fileName}`;
    const photo = await prisma.jobPhoto.findFirst({
      where: {
        companyId: assetCompanyId,
        jobId,
        job: {
          companyId: assetCompanyId,
          ...(portal ? { customerId: portal.customerId } : {}),
        },
        ...(portal ? { customerVisible: true } : {}),
        OR: [{ fileUrl }, { thumbnailUrl: fileUrl }],
      },
      select: { id: true },
    });
    if (!photo) return new Response("Not found", { status: 404 });
    return assetResponse(await localJobPhotoStorage.readDataUrl(fileUrl));
  }
  return new Response("Not found", { status: 404 });
}
