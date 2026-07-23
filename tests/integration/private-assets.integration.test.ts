import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal/context", () => ({ getCustomerPortalContext: vi.fn().mockResolvedValue(null) }));
const auth = vi.hoisted(() => ({ context: vi.fn() }));
const storage = vi.hoisted(() => ({ readLogo: vi.fn(), createLogoUrl: vi.fn(), readPhoto: vi.fn() }));
vi.mock("@/lib/auth/tenant", () => ({ AuthorizationError: class AuthorizationError extends Error { constructor(public code: string, message: string) { super(message); } }, requireTenantContext: auth.context }));
vi.mock("@/lib/storage/jobPhotoStorage", () => ({ localJobPhotoStorage: { readDataUrl: storage.readPhoto } }));
vi.mock("@/lib/storage/companyLogoStorage", () => ({ localCompanyLogoStorage: { readDataUrl: storage.readLogo, createReadUrl: storage.createLogoUrl } }));

import { GET } from "@/app/api/private/assets/[...path]/route";
import { prisma } from "@/lib/prisma";

const request = (path: string[]) => GET(new Request("http://localhost/api/private/assets"), { params: Promise.resolve({ path }) });
const logoPath = (companyId: string) => `/api/private/assets/company-logos/${companyId}/logo.png`;

describe("private asset database authorization and tenant storage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    storage.readPhoto.mockResolvedValue("data:image/jpeg;base64,eA==");
    storage.readLogo.mockResolvedValue("data:image/png;base64,eA==");
    storage.createLogoUrl.mockResolvedValue(null);
    await resetIntegrationDatabase();
  });
  afterAll(async () => { await resetIntegrationDatabase(); });

  it("allows an authenticated tenant to download its owned photo only", async () => {
    const { a } = await createTenantFixtures();
    auth.context.mockResolvedValue({ companyId: a.company.id });
    const response = await request(["job-photos", a.company.id, a.job.id, "photo.jpg"]);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private");
  });

  it("persists a stable logo path and streams local private bytes for its tenant", async () => {
    const { a } = await createTenantFixtures();
    const stablePath = logoPath(a.company.id);
    await prisma.company.update({ where: { id: a.company.id }, data: { logoUrl: stablePath } });
    auth.context.mockResolvedValue({ companyId: a.company.id });
    const response = await request(["company-logos", a.company.id, "logo.png"]);
    expect((await prisma.company.findUniqueOrThrow({ where: { id: a.company.id }, select: { logoUrl: true } })).logoUrl).toBe(stablePath);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(storage.readLogo).toHaveBeenCalledWith(stablePath);
  });

  it("hides another tenant's photo and logo", async () => {
    const { a, b } = await createTenantFixtures();
    await prisma.company.update({ where: { id: b.company.id }, data: { logoUrl: logoPath(b.company.id) } });
    auth.context.mockResolvedValue({ companyId: a.company.id });
    expect((await request(["job-photos", b.company.id, b.job.id, "photo.jpg"])).status).toBe(404);
    expect((await request(["company-logos", b.company.id, "logo.png"])).status).toBe(404);
    expect(storage.readLogo).not.toHaveBeenCalled();
  });

  it("returns not found for a missing owned logo so the UI fallback is used", async () => {
    const { a } = await createTenantFixtures();
    await prisma.company.update({ where: { id: a.company.id }, data: { logoUrl: logoPath(a.company.id) } });
    auth.context.mockResolvedValue({ companyId: a.company.id });
    storage.readLogo.mockResolvedValue(null);
    expect((await request(["company-logos", a.company.id, "logo.png"])).status).toBe(404);
  });

  it("renews expired signed logo URLs on each authorized read", async () => {
    const { a } = await createTenantFixtures();
    await prisma.company.update({ where: { id: a.company.id }, data: { logoUrl: logoPath(a.company.id) } });
    auth.context.mockResolvedValue({ companyId: a.company.id });
    storage.createLogoUrl.mockResolvedValueOnce("https://storage.test/logo?token=fresh-1").mockResolvedValueOnce("https://storage.test/logo?token=fresh-2");
    const first = await request(["company-logos", a.company.id, "logo.png"]);
    const renewed = await request(["company-logos", a.company.id, "logo.png"]);
    expect(first.status).toBe(307);
    expect(first.headers.get("location")).toContain("fresh-1");
    expect(renewed.headers.get("location")).toContain("fresh-2");
    expect(storage.createLogoUrl).toHaveBeenCalledTimes(2);
  });

  it("rejects unauthenticated private asset requests", async () => {
    const { AuthorizationError } = await import("@/lib/auth/tenant");
    auth.context.mockRejectedValue(new AuthorizationError("UNAUTHENTICATED" as never, "Sign in"));
    expect((await request(["company-logos", "tenant", "logo.png"])).status).toBe(401);
  });
});
