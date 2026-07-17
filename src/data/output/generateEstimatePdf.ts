import { jsPDF } from "jspdf";

import { EstimatePdf } from "./buildEstimatePdf";

async function signaturePngToJpeg(signatureData: string) {
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(signatureData)) {
    throw new Error("Stored signature image is invalid.");
  }

  const image = new Image();
  image.src = signatureData;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Stored signature image could not be decoded."));
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || 700;
  canvas.height = image.naturalHeight || 180;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Signature image could not be prepared.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function generateEstimatePdf(
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
    const signatureImage = await signaturePngToJpeg(estimate.signature.image);
    pdf.addImage(signatureImage, "JPEG", 20, y, 80, 25);
  } else {
    pdf.text("Customer Signature: Not yet signed", 20, y);
  }

  pdf.save(
    `${estimate.estimateNumber}.pdf`
  );
}
