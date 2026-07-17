import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireTenantContext: vi.fn(), findCompany: vi.fn(), findPhoto: vi.fn(), readLogo: vi.fn(), readPhoto: vi.fn() }));
vi.mock("@/lib/auth/tenant", () => ({ AuthorizationError: class AuthorizationError extends Error { constructor(public code: string, message: string) { super(message); } }, requireTenantContext: mocks.requireTenantContext }));
vi.mock("@/lib/prisma", () => ({ prisma: { company: { findFirst: mocks.findCompany }, jobPhoto: { findFirst: mocks.findPhoto } } }));
vi.mock("@/lib/storage/companyLogoStorage", () => ({ localCompanyLogoStorage: { readDataUrl: mocks.readLogo } }));
vi.mock("@/lib/storage/jobPhotoStorage", () => ({ localJobPhotoStorage: { readDataUrl: mocks.readPhoto } }));
import { GET } from "./route";

const request = new Request("http://localhost/api/private/assets/x");
const call = (path: string[]) => GET(request, { params: Promise.resolve({ path }) });
describe("private tenant assets", () => {
  beforeEach(() => vi.clearAllMocks());
  it("rejects unauthenticated requests", async () => { const { AuthorizationError } = await import("@/lib/auth/tenant"); mocks.requireTenantContext.mockRejectedValue(new AuthorizationError("UNAUTHENTICATED" as never, "Sign in")); expect((await call(["company-logos", "tenant-a", "logo.png"])).status).toBe(401); });
  it("hides another tenant's asset", async () => { mocks.requireTenantContext.mockResolvedValue({ companyId: "tenant-a" }); expect((await call(["company-logos", "tenant-b", "logo.png"])).status).toBe(404); expect(mocks.findCompany).not.toHaveBeenCalled(); });
  it("returns an owned asset with private cache headers", async () => { mocks.requireTenantContext.mockResolvedValue({ companyId: "tenant-a" }); mocks.findCompany.mockResolvedValue({ id: "tenant-a" }); mocks.readLogo.mockResolvedValue("data:image/png;base64,eA=="); const response = await call(["company-logos", "tenant-a", "logo.png"]); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("private"); expect(response.headers.get("content-type")).toBe("image/png"); });
  it("rejects traversal-shaped paths", async () => { mocks.requireTenantContext.mockResolvedValue({ companyId: "tenant-a" }); expect((await call(["job-photos", "tenant-a", "..", "photo.jpg"])).status).toBe(404); });
});
