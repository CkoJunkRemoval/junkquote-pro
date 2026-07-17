import { describe, expect, it } from "vitest";
import { canTransitionInvoiceStatus } from "./statusWorkflow";

describe("invoice status workflow", () => {
  it("allows supported invoice transitions", () => {
    expect(canTransitionInvoiceStatus("Draft", "Sent")).toBe(true);
    expect(canTransitionInvoiceStatus("Sent", "Partial")).toBe(true);
    expect(canTransitionInvoiceStatus("Partial", "Paid")).toBe(true);
  });

  it("blocks paid-to-draft and cancelled-to-paid transitions", () => {
    expect(canTransitionInvoiceStatus("Paid", "Draft")).toBe(false);
    expect(canTransitionInvoiceStatus("Cancelled", "Paid")).toBe(false);
  });
});
