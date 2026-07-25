import { describe, expect, it } from "vitest";
import { financeDocumentKey } from "./financeDocumentStorage";

describe("finance document privacy", () => {
  it("creates tenant- and document-scoped private object keys", () => {
    expect(financeDocumentKey("company-1", "document-1", "receipt.pdf")).toBe(
      "finance-documents/company-1/document-1/receipt.pdf",
    );
  });

  it("rejects traversal in finance object keys", () => {
    expect(() =>
      financeDocumentKey("company-1", "document-1", "../receipt.pdf"),
    ).toThrow();
  });
});
