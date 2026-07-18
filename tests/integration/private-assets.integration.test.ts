import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/portal/context", () => ({ getCustomerPortalContext: vi.fn().mockResolvedValue(null) }));
const auth = vi.hoisted(() => ({ context: vi.fn() }));
vi.mock("@/lib/auth/tenant", () => ({ AuthorizationError: class AuthorizationError extends Error { constructor(public code: string, message: string) { super(message); } }, requireTenantContext: auth.context }));
vi.mock("@/lib/storage/jobPhotoStorage", () => ({ localJobPhotoStorage: { readDataUrl: vi.fn().mockResolvedValue("data:image/jpeg;base64,eA==") } }));
vi.mock("@/lib/storage/companyLogoStorage", () => ({ localCompanyLogoStorage: { readDataUrl: vi.fn().mockResolvedValue("data:image/png;base64,eA==") } }));
import { GET } from "@/app/api/private/assets/[...path]/route";

describe("private asset database authorization", () => {
  beforeEach(async () => { vi.clearAllMocks(); await resetIntegrationDatabase(); });
  afterAll(async () => { await resetIntegrationDatabase(); });
  it("allows an authenticated tenant to download its owned photo only", async () => { const { a } = await createTenantFixtures(); auth.context.mockResolvedValue({ companyId: a.company.id }); const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ path: ["job-photos", a.company.id, a.job.id, "photo.jpg"] }) }); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("private"); });
  it("hides another tenant's private asset", async () => { const { a, b } = await createTenantFixtures(); auth.context.mockResolvedValue({ companyId: a.company.id }); const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ path: ["job-photos", b.company.id, b.job.id, "photo.jpg"] }) }); expect(response.status).toBe(404); });
  it("rejects unauthenticated private asset requests", async () => { const { AuthorizationError } = await import("@/lib/auth/tenant"); auth.context.mockRejectedValue(new AuthorizationError("UNAUTHENTICATED" as never, "Sign in")); const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ path: ["job-photos", "tenant", "job", "photo.jpg"] }) }); expect(response.status).toBe(401); });
});
