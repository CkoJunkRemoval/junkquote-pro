import { describe, expect, it } from "vitest";
import {
  parseInvoiceManagementPeriod,
  parseInvoiceManagementStatus,
} from "./invoiceListFilters";

describe("invoice list dashboard filters", () => {
  it("accepts financial KPI targets", () => {
    expect(parseInvoiceManagementStatus("Outstanding")).toBe("Outstanding");
    expect(parseInvoiceManagementStatus("Paid")).toBe("Paid");
    expect(parseInvoiceManagementPeriod("ThisMonth")).toBe("ThisMonth");
  });

  it("rejects unknown URL filters", () => {
    expect(parseInvoiceManagementStatus("UnpaidForever")).toBe("All");
    expect(parseInvoiceManagementPeriod("LastYear")).toBeUndefined();
  });
});
