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

  pdf.text(
    "Customer Signature:",
    20,
    y
  );

  y += 12;

  pdf.line(20, y, 100, y);

  pdf.save(
    `${estimate.estimateNumber}.pdf`
  );
}