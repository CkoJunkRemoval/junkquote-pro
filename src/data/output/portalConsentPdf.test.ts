import { describe, expect, it } from "vitest";
import { buildPublicEstimatePdf } from "./buildPublicEstimatePdf";

describe("portal consent PDF", () => {
  it("records electronic consent without treating text as image data", () => {
    const pdf = buildPublicEstimatePdf({
      company: { name: "Acme", logoUrl: null, primaryColor: null, secondaryColor: null },
      customerName: "Customer",
      propertyAddress: { address: "1 Main", city: "Town", state: "NY", zip: "10001" },
      jobSites: [],
      pricing: { subtotal: 10, labor: 0, disposal: 0, discount: 0, total: 10 },
      status: "Approved",
      signature: { signerName: "Customer", signedAt: new Date(), method: "PublicLink", data: "consent" },
    } as never);
    expect(pdf.signature).toMatchObject({ signerName: "Customer", image: undefined });
  });
});
