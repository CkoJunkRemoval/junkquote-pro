import { beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const readDataUrl = vi.hoisted(() => vi.fn());
vi.mock("@/lib/storage/companyLogoStorage", () => ({ localCompanyLogoStorage: { readDataUrl } }));

import { drawPdfBrandHeader, loadPdfBranding, parsePdfColor } from "./pdfBranding";
import { buildPublicEstimatePdf } from "./buildPublicEstimatePdf";
import { renderEstimatePdf } from "./renderEstimatePdf";

describe("PDF branding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads a server-side logo and embeds it in a branded header", async () => {
    readDataUrl.mockResolvedValue("data:image/png;base64,AA==");
    const branding = await loadPdfBranding({ name: "Acme", logoUrl: "/uploads/company-logos/logo.png", primaryColor: "#123456", secondaryColor: "#abcdef" });
    const pdf = { setFont: vi.fn(), setFontSize: vi.fn(), setTextColor: vi.fn(), text: vi.fn(), setDrawColor: vi.fn(), setLineWidth: vi.fn(), line: vi.fn(), getImageProperties: vi.fn().mockReturnValue({ width: 100, height: 50 }), addImage: vi.fn() };
    drawPdfBrandHeader(pdf as never, branding, "Estimate");
    expect(readDataUrl).toHaveBeenCalledWith("/uploads/company-logos/logo.png");
    expect(pdf.addImage).toHaveBeenCalled();
  });

  it("falls back safely when the logo is missing or unreadable", async () => {
    readDataUrl.mockResolvedValue(null);
    const branding = await loadPdfBranding({ name: "Acme", logoUrl: "/uploads/company-logos/missing.png" });
    expect(branding.logoData).toBeNull();
    expect(branding.name).toBe("Acme");
  });

  it("validates brand colors and uses neutral fallbacks for invalid values", () => {
    expect(parsePdfColor("#123456", [0, 0, 0])).toEqual([18, 52, 86]);
    expect(parsePdfColor("blue", [1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("preserves a signed estimate while adding branding", () => {
    const estimate = buildPublicEstimatePdf({ company: { name: "Acme", primaryColor: "#123456", secondaryColor: "#abcdef", logoUrl: null }, customerName: "Jamie", propertyAddress: { address: "1 Main", city: "Town", state: "NY", zip: "10001" }, jobSites: [], pricing: { subtotal: 0, labor: 0, disposal: 0, discount: 0, total: 0 }, status: "Approved", signature: { signerName: "Jamie", signedAt: new Date("2026-01-01"), method: "TeamDevice", data: "data:image/png;base64,valid" } } as never);
    expect(estimate.branding?.primaryColor).toBe("#123456");
    expect(estimate.signature?.signerName).toBe("Jamie");
  });

  it("can generate a branded development sample when requested", async () => {
    if (process.env.GENERATE_BRANDED_PDF_SAMPLE !== "1") return;
    readDataUrl.mockResolvedValue(null);
    const sample = await renderEstimatePdf({ title: "Acme Hauling Estimate", estimateNumber: "EST-SAMPLE", createdDate: "2026-07-17", sections: [{ title: "Customer", rows: [{ label: "Name", value: "Sample Customer" }] }], total: "$125.00", branding: { name: "Acme Hauling", primaryColor: "#2563eb", secondaryColor: "#0f172a" } });
    const output = path.join(process.cwd(), "public", "samples", "branded-estimate-sample.pdf");
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, Buffer.from(sample, "base64"));
    expect(sample.length).toBeGreaterThan(100);
  });
});
