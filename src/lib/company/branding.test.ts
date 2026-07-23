import { beforeEach, describe, expect, it, vi } from "vitest";
import { maxLogoFileSize, validateLogoFile } from "@/lib/storage/companyLogoStorage";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn(), saveLogo: vi.fn(), removeLogo: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { company: { findUnique: mocks.findUnique, update: mocks.update } } }));
vi.mock("@/lib/storage/companyLogoStorage", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/storage/companyLogoStorage")>()), localCompanyLogoStorage: { save: mocks.saveLogo, remove: mocks.removeLogo } }));

import { getCompanyBranding, removeCompanyLogo, updateCompanyBranding, uploadCompanyLogo } from "./branding";

const company = { id: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa", name: "Legacy Name", displayName: "JunkQuote Pro", legalName: "JunkQuote Pro", logoUrl: null };

describe("company branding settings", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.findUnique.mockResolvedValue(company); mocks.update.mockResolvedValue(company); });

  it("reads only the authenticated company and preserves defaults", async () => {
    await getCompanyBranding("tenant-a");
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "tenant-a" } }));
  });

  it("updates tenant-scoped settings with clean values", async () => {
    await updateCompanyBranding("tenant-a", { displayName: " Acme Hauling ", invoicePrefix: " inv ", defaultTaxRate: 7.5, defaultMinimumCharge: 99 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "tenant-a" }, data: expect.objectContaining({ displayName: "Acme Hauling", invoicePrefix: "INV", defaultTaxRate: 7.5, defaultMinimumCharge: 99 }) }));
  });

  it("rejects invalid financial and regional settings", async () => {
    await expect(updateCompanyBranding("tenant-a", { defaultTaxRate: -1 })).rejects.toThrow("Tax rate");
    await expect(updateCompanyBranding("tenant-a", { defaultMinimumCharge: -1 })).rejects.toThrow("Minimum charge");
    await expect(updateCompanyBranding("tenant-a", { timezone: "Mars/Olympus" })).rejects.toThrow("Unsupported timezone");
    await expect(updateCompanyBranding("tenant-a", { currencyCode: "EUR" })).rejects.toThrow("Unsupported currency");
  });

  it("validates logo mime type and size before storage", () => {
    expect(() => validateLogoFile(new File(["x"], "logo.gif", { type: "image/gif" }))).toThrow("JPEG, PNG, or WebP");
    expect(() => validateLogoFile(new File([new Uint8Array(maxLogoFileSize + 1)], "logo.png", { type: "image/png" }))).toThrow("2 MB");
    expect(() => validateLogoFile(new File(["x"], "logo.png", { type: "image/png" }))).not.toThrow();
  });

  it("rejects another tenant without mutating settings", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(updateCompanyBranding("tenant-b", { displayName: "Hidden" })).rejects.toThrow("Company not found");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("stores and removes logos only through authenticated tenant ownership", async () => {
    const existing = { ...company, id: "tenant-a", logoUrl: "/api/private/assets/company-logos/tenant-a/old.png" };
    mocks.findUnique.mockResolvedValue(existing); mocks.saveLogo.mockResolvedValue("/api/private/assets/company-logos/tenant-a/new.png"); mocks.update.mockResolvedValue({ ...existing, logoUrl: "/api/private/assets/company-logos/tenant-a/new.png" });
    const file = new File(["x"], "logo.png", { type: "image/png" });
    await uploadCompanyLogo("tenant-a", file);
    expect(mocks.saveLogo).toHaveBeenCalledWith("tenant-a", file);
    expect(mocks.removeLogo).toHaveBeenCalledWith("tenant-a", existing.logoUrl);
    mocks.removeLogo.mockClear(); await removeCompanyLogo("tenant-a");
    expect(mocks.removeLogo).toHaveBeenCalledWith("tenant-a", existing.logoUrl);
  });
});
