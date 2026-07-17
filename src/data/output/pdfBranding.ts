import { jsPDF } from "jspdf";
import { localCompanyLogoStorage } from "@/lib/storage/companyLogoStorage";

export type PdfBrandSource = { name: string; displayName?: string | null; logoUrl?: string | null; primaryColor?: string | null; secondaryColor?: string | null };
export type PdfBranding = { name: string; primary: [number, number, number]; secondary: [number, number, number]; logoData: string | null };

const neutralPrimary: [number, number, number] = [30, 41, 59];
const neutralSecondary: [number, number, number] = [71, 85, 105];

export function parsePdfColor(value: string | null | undefined, fallback: [number, number, number]) {
  if (!value || !/^#[0-9a-fA-F]{6}$/.test(value)) return fallback;
  return [Number.parseInt(value.slice(1, 3), 16), Number.parseInt(value.slice(3, 5), 16), Number.parseInt(value.slice(5, 7), 16)] as [number, number, number];
}

export async function loadPdfBranding(company: PdfBrandSource): Promise<PdfBranding> {
  return { name: company.displayName || company.name || "JunkQuote Pro", primary: parsePdfColor(company.primaryColor, neutralPrimary), secondary: parsePdfColor(company.secondaryColor, neutralSecondary), logoData: await localCompanyLogoStorage.readDataUrl(company.logoUrl) };
}

export function drawPdfBrandHeader(pdf: jsPDF, branding: PdfBranding, title: string) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(...branding.primary);
  pdf.text(title, 20, 20);
  pdf.setDrawColor(...branding.secondary);
  pdf.setLineWidth(0.8);
  pdf.line(20, 24, 190, 24);
  if (branding.logoData) {
    try {
      const properties = pdf.getImageProperties(branding.logoData);
      const maxWidth = 34; const maxHeight = 16;
      const ratio = Math.min(maxWidth / properties.width, maxHeight / properties.height);
      const width = properties.width * ratio; const height = properties.height * ratio;
      const format = branding.logoData.startsWith("data:image/png") ? "PNG" : branding.logoData.startsWith("data:image/webp") ? "WEBP" : "JPEG";
      pdf.addImage(branding.logoData, format, 190 - width, 6, width, height);
    } catch { /* invalid or unsupported logo remains a text-only document */ }
  }
  pdf.setTextColor(0, 0, 0);
}

export function drawPdfSectionHeading(pdf: jsPDF, branding: PdfBranding, title: string, y: number) {
  pdf.setTextColor(...branding.secondary); pdf.setFont("helvetica", "bold"); pdf.text(title, 20, y); pdf.setTextColor(0, 0, 0);
}
