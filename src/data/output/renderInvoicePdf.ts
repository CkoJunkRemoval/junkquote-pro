import { jsPDF } from "jspdf";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
import { drawPdfBrandHeader, drawPdfSectionHeading, loadPdfBranding } from "./pdfBranding";

export async function renderInvoicePdf(invoice: NonNullable<Awaited<ReturnType<typeof getInvoiceDetail>>>) {
  const pdf = new jsPDF(); const branding = await loadPdfBranding(invoice.company); const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); let y = 33;
  drawPdfBrandHeader(pdf, branding, branding.name); pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.text(`Invoice #${invoice.displayNumber ?? invoice.invoiceNumber}`, 20, y); y += 11; pdf.setFont("helvetica", "normal"); pdf.setFontSize(12);
  pdf.text(`${invoice.customer.firstName} ${invoice.customer.lastName}`, 20, y); y += 7; pdf.text(`${invoice.property.address}, ${invoice.property.city}, ${invoice.property.state} ${invoice.property.zip}`, 20, y); y += 7; if(invoice.job?.scheduledStart){pdf.text(`Job date: ${invoice.job.scheduledStart.toLocaleDateString()}`,20,y);y+=7;} if(invoice.dueDate){pdf.text(`Due date: ${invoice.dueDate.toLocaleDateString()}`,20,y);y+=7;} y += 5;
  drawPdfSectionHeading(pdf, branding, "Invoice details", y); y += 8; pdf.setFont("helvetica", "normal");
  if(invoice.lineItems.length){invoice.lineItems.forEach((item) => { if (y > 260) { pdf.addPage(); drawPdfBrandHeader(pdf, branding, branding.name); y = 33; } pdf.text(`${item.quantity} x ${item.description}`, 20, y); pdf.text(money(item.amount), 190, y, {align:"right"}); y += 7; });} else invoice.estimate.jobSites.forEach((site) => { if (y > 260) { pdf.addPage(); drawPdfBrandHeader(pdf, branding, branding.name); y = 33; } pdf.text(site.name, 20, y); y += 6; site.items.forEach((item) => { pdf.text(`${item.quantity} x ${item.name}${item.notes ? ` - ${item.notes}` : ""}`, 25, y); y += 6; }); y += 3; });
  if (y > 235) { pdf.addPage(); drawPdfBrandHeader(pdf, branding, branding.name); y = 33; }
  pdf.setFont("helvetica", "bold"); pdf.text(`Subtotal: ${money(invoice.subtotal)}`, 20, y); y += 7; pdf.text(`Tax: ${money(invoice.tax)}`, 20, y); y += 7; pdf.text(`Discounts: ${money(invoice.discounts)}`, 20, y); y += 7; pdf.setTextColor(...branding.primary); pdf.setFontSize(16); pdf.text(`Total: ${money(invoice.total)}`, 20, y); pdf.setTextColor(0, 0, 0); y += 8; pdf.setFontSize(12); pdf.text(`Balance Due: ${money(invoice.balanceDue)}`, 20, y); y += 8; pdf.text(`Status: ${invoice.status}`, 20, y); y += 8; if (invoice.dueDate) pdf.text(`Due: ${invoice.dueDate.toLocaleDateString()}`, 20, y); y += 8; if (invoice.notes) pdf.text(`Notes: ${invoice.notes}`, 20, y);
  return Buffer.from(pdf.output("arraybuffer")).toString("base64");
}
