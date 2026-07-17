import { beforeEach, describe, expect, it, vi } from "vitest";
import { maxLogoFileSize, validateLogoFile } from "@/lib/storage/companyLogoStorage";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { company: { findFirst: mocks.findFirst, update: mocks.update } } }));
vi.mock("@/lib/storage/companyLogoStorage", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/storage/companyLogoStorage")>()), localCompanyLogoStorage: { save: vi.fn(), remove: vi.fn() } }));

import { getCompanyBranding, updateCompanyBranding } from "./branding";

const company = { id: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa", name: "Legacy Name", displayName: "JunkQuote Pro", legalName: "JunkQuote Pro", logoUrl: null };

describe("company branding settings", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.findFirst.mockResolvedValue(company); mocks.update.mockResolvedValue(company); });

  it("reads only the development company and preserves defaults", async () => {
    await getCompanyBranding();
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa" } }));
  });

  it("updates tenant-scoped settings with clean values", async () => {
    await updateCompanyBranding({ displayName: " Acme Hauling ", invoicePrefix: " inv ", defaultTaxRate: 7.5, defaultMinimumCharge: 99 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa" }, data: expect.objectContaining({ displayName: "Acme Hauling", invoicePrefix: "INV", defaultTaxRate: 7.5, defaultMinimumCharge: 99 }) }));
  });

  it("rejects invalid financial and regional settings", async () => {
    await expect(updateCompanyBranding({ defaultTaxRate: -1 })).rejects.toThrow("Tax rate");
    await expect(updateCompanyBranding({ defaultMinimumCharge: -1 })).rejects.toThrow("Minimum charge");
    await expect(updateCompanyBranding({ timezone: "Mars/Olympus" })).rejects.toThrow("Unsupported timezone");
    await expect(updateCompanyBranding({ currencyCode: "EUR" })).rejects.toThrow("Unsupported currency");
  });

  it("validates logo mime type and size before storage", () => {
    expect(() => validateLogoFile(new File(["x"], "logo.gif", { type: "image/gif" }))).toThrow("JPEG, PNG, or WebP");
    expect(() => validateLogoFile(new File([new Uint8Array(maxLogoFileSize + 1)], "logo.png", { type: "image/png" }))).toThrow("2 MB");
    expect(() => validateLogoFile(new File(["x"], "logo.png", { type: "image/png" }))).not.toThrow();
  });
});
