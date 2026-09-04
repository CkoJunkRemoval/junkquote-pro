// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  sendInvoice: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@/app/actions/invoices/invoiceMutations", () => ({
  getInvoicePaymentLinkAction: vi.fn(),
  sendInvoiceAction: actions.sendInvoice,
  updateDraftInvoiceAction: vi.fn(),
}));
vi.mock("@/app/actions/invoices/updateInvoiceStatus", () => ({
  updateInvoiceStatusAction: vi.fn(),
}));
vi.mock("@/app/actions/invoices/downloadInvoicePdf", () => ({
  downloadInvoicePdfAction: vi.fn(),
}));

import InvoiceDetail from "./InvoiceDetail";

const invoice = {
  id: "invoice-123",
  invoiceNumber: 123,
  displayNumber: "INV-123",
  status: "Draft",
  sentAt: null,
  viewedAt: null,
  paidDate: null,
  voidedAt: null,
  dueDate: null,
  createdAt: new Date("2026-09-01T12:00:00Z"),
  subtotal: 100,
  tax: 0,
  discounts: 0,
  total: 100,
  balanceDue: 100,
  notes: "",
  lineItems: [],
  company: { name: "Junk Co", displayName: "Junk Co" },
  customer: {
    firstName: "Jamie",
    lastName: "Customer",
    phone: null,
    email: "customer@example.com",
  },
  property: {
    address: "1 Main Street",
    city: "Portland",
    state: "ME",
    zip: "04101",
  },
  job: null,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("invoice email review UI", () => {
  it("invokes the real action binding once with reviewed invoice data", async () => {
    let resolveSend!: (value: unknown) => void;
    actions.sendInvoice.mockReturnValue(new Promise((resolve) => { resolveSend = resolve; }));
    render(<InvoiceDetail initialInvoice={invoice as never} />);

    fireEvent.click(screen.getByRole("button", { name: "Email Invoice" }));
    fireEvent.change(screen.getByLabelText("Recipient"), {
      target: { value: "reviewed@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Invoice" }));

    expect(
      (screen.getByRole("button", { name: "Sending..." }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(actions.sendInvoice).toHaveBeenCalledOnce();
    expect(actions.sendInvoice).toHaveBeenCalledWith("invoice-123", {
      recipient: "reviewed@example.com",
      subject: "INV-123 from Junk Co",
      message: "Your invoice is ready.",
    });

    resolveSend({
      ok: true,
      invoice: { ...invoice, sentAt: new Date(), lastSentTo: "reviewed@example.com" },
    });
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain(
      "Invoice emailed to reviewed@example.com.",
    ));
  });

  it("keeps the review UI open and shows a safe action error", async () => {
    actions.sendInvoice.mockResolvedValue({
      ok: false,
      error: "We couldn't send this invoice email. Please try again.",
    });
    render(<InvoiceDetail initialInvoice={invoice as never} />);

    fireEvent.click(screen.getByRole("button", { name: "Email Invoice" }));
    fireEvent.click(screen.getByRole("button", { name: "Send Invoice" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain(
      "We couldn't send this invoice email. Please try again.",
    ));
    expect(screen.getByRole("heading", { name: "Review invoice email" })).toBeTruthy();
    expect(actions.sendInvoice).toHaveBeenCalledOnce();
  });
});
