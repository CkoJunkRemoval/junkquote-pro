// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/app/actions/communications/communications", () => ({
  manualSendCommunicationAction: actions.send,
}));

import ManualEmailForm from "./ManualEmailForm";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const props = {
  customers: [{ id: "customer-1", firstName: "Jamie", lastName: "Customer", email: "customer@example.com" }],
  manual: { customerId: "customer-1", sourceType: "Invoice", sourceId: "invoice-1" },
  buttonClassName: "button",
};

describe("manual email form", () => {
  it("submits the reviewed live form once and shows provider success", async () => {
    actions.send.mockResolvedValue({ ok: true, error: null });
    render(<ManualEmailForm {...props} />);
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Invoice question" } });
    fireEvent.change(screen.getByLabelText("Message preview"), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send email" }));

    await waitFor(() => expect(actions.send).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Email sent successfully."));
    const formData = actions.send.mock.calls[0][1] as FormData;
    expect(formData.get("customerId")).toBe("customer-1");
    expect(formData.get("sourceType")).toBe("Invoice");
    expect(formData.get("sourceId")).toBe("invoice-1");
  });

  it("shows a safe failure without fake success", async () => {
    actions.send.mockResolvedValue({ ok: false, error: "We couldn't send this email. Please try again." });
    render(<ManualEmailForm {...props} />);
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Invoice question" } });
    fireEvent.change(screen.getByLabelText("Message preview"), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send email" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("We couldn't send this email."));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
