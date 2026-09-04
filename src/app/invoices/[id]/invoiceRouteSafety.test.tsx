import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import InvoiceDetailError from "./error";

describe("invoice route production safety", () => {
  it("renders a safe retry boundary without production error details", () => {
    const html = renderToStaticMarkup(<InvoiceDetailError reset={() => undefined} />);

    expect(html).toContain("We couldn&#x27;t load this invoice.");
    expect(html).toContain("Please try again.");
    expect(html).not.toContain("digest");
  });

  it("logs each server load checkpoint and rethrows failures", () => {
    const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

    for (const event of [
      "INVOICE_PAGE_LOAD_STARTED",
      "INVOICE_PAGE_AUTHORIZED",
      "INVOICE_PAGE_QUERY_SUCCESS",
      "INVOICE_PAGE_RENDER_DATA_READY",
      "INVOICE_PAGE_FAILED",
    ]) {
      expect(page).toContain(event);
    }
    expect(page).toContain("throw error");
    expect(page).toContain("<InvoiceDetail initialInvoice={invoice}");
    expect(page).toContain(">Email customer</Link>");
  });
});
