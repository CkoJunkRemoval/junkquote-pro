import jsPDF from "jspdf";

import { EstimatePdf } from "./buildEstimatePdf";

export function generateEstimatePdf(
  estimate: EstimatePdf
) {
  const pdf = new jsPDF();

  let y = 20;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);

  pdf.text(estimate.title, 20, y);

  y += 10;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");

  pdf.text(
    `Estimate #: ${estimate.estimateNumber}`,
    20,
    y
  );

  y += 7;

  pdf.text(
    `Created: ${estimate.createdDate}`,
    20,
    y
  );

  y += 15;

  estimate.sections.forEach((section) => {
    if (y > 250) { pdf.addPage(); y = 20; }
    pdf.setFont("helvetica", "bold");

    pdf.text(section.title, 20, y);

    y += 8;

    pdf.setFont("helvetica", "normal");

    section.rows.forEach((row) => {
      pdf.text(
        `${row.label}: ${row.value}`,
        25,
        y
      );

      y += 7;
    });

    y += 6;
  });

  pdf.setFont("helvetica", "bold");

  pdf.setFontSize(18);

  pdf.text(
    `Estimated Total: ${estimate.total}`,
    20,
    y
  );

  y += 20;

  pdf.setFontSize(12);

  pdf.text("Status: " + (estimate.status ?? (estimate.signature ? "Approved" : "Unsigned")), 20, y);
  y += 10;
  if (estimate.signature) {
    pdf.text(`Signer: ${estimate.signature.signerName}`, 20, y); y += 7;
    pdf.text(`Signed: ${estimate.signature.signedAt}`, 20, y); y += 7;
    pdf.text(`Method: ${estimate.signature.method}`, 20, y); y += 10;
    pdf.addImage(estimate.signature.image, "PNG", 20, y, 80, 25);
  } else {
    pdf.text("Customer Signature: Not yet signed", 20, y);
  }

  pdf.save(
    `${estimate.estimateNumber}.pdf`
  );
}
