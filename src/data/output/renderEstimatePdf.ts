import { jsPDF } from "jspdf";
import type { EstimatePdf } from "./buildEstimatePdf";
import { drawPdfBrandHeader, drawPdfSectionHeading, loadPdfBranding } from "./pdfBranding";

export async function renderEstimatePdf(estimate: EstimatePdf) {
  const pdf = new jsPDF();
  const branding = await loadPdfBranding(estimate.branding ?? { name: estimate.title });
  drawPdfBrandHeader(pdf, branding, estimate.title);
  let y = 33;
  pdf.setFontSize(12); pdf.setFont("helvetica", "normal");
  pdf.text(`Estimate: ${estimate.estimateNumber}`, 20, y); y += 7;
  pdf.text(`Created: ${estimate.createdDate}`, 20, y); y += 13;
  estimate.sections.forEach((section) => {
    if (y > 250) { pdf.addPage(); drawPdfBrandHeader(pdf, branding, estimate.title); y = 33; }
    drawPdfSectionHeading(pdf, branding, section.title, y); y += 8;
    pdf.setFont("helvetica", "normal");
    section.rows.forEach((row) => { pdf.text(`${row.label}: ${row.value}`, 25, y); y += 7; }); y += 5;
  });
  pdf.setTextColor(...branding.primary); pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.text(`Estimated Total: ${estimate.total}`, 20, y); pdf.setTextColor(0, 0, 0); y += 15;
  pdf.setFontSize(12); pdf.text(`Status: ${estimate.status ?? "Unsigned"}`, 20, y); y += 10;
  if (estimate.signature) { pdf.text(`Signer: ${estimate.signature.signerName}`, 20, y); y += 7; pdf.text(`Signed: ${estimate.signature.signedAt}`, 20, y); y += 7; pdf.text(`Method: ${estimate.signature.method}`, 20, y); y += 10; pdf.addImage(estimate.signature.image, "PNG", 20, y, 80, 25); } else pdf.text("Customer Signature: Not yet signed", 20, y);
  return Buffer.from(pdf.output("arraybuffer")).toString("base64");
}
