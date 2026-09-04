// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PublicEstimateApproval as PublicEstimate } from "@/lib/estimates/getPublicEstimateByApprovalToken";
import PublicEstimateApproval from "./PublicEstimateApproval";

const respond = vi.fn();

vi.mock("@/app/actions/estimates/respondToEstimateApproval", () => ({
  respondToEstimateApprovalAction: (...args: unknown[]) => respond(...args),
}));
vi.mock("@/app/actions/estimates/downloadSignedPublicEstimatePdf", () => ({
  downloadSignedPublicEstimatePdfAction: vi.fn(),
}));
vi.mock("@/data/output/downloadPdf", () => ({ downloadPdf: vi.fn() }));
vi.mock("@/components/company/CompanyLogo", () => ({
  CompanyLogo: ({ companyName }: { companyName: string }) => (
    <span aria-label={`${companyName} logo`}>AC</span>
  ),
}));
vi.mock("@/components/estimate/SignaturePad", () => ({
  default: ({ onChange }: { onChange: (value: string) => void }) => (
    <button
      type="button"
      onClick={() => onChange("data:image/png;base64,signed")}
    >
      Add signature
    </button>
  ),
}));

const baseEstimate: PublicEstimate = {
  estimateNumber: "EST-1042",
  estimateDate: new Date("2026-09-01T12:00:00.000Z"),
  company: {
    name: "Acme Hauling",
    phone: "555-0100",
    email: "hello@acme.test",
    website: "acme.test",
    logoUrl: null,
    primaryColor: "#2563eb",
    secondaryColor: null,
  },
  customerName: "Jamie Customer",
  propertyAddress: {
    address: "1 Main Street",
    city: "Town",
    state: "NY",
    zip: "10001",
  },
  jobSites: [
    {
      name: "Garage",
      customerNotes: "Use side door",
      items: [
        { name: "Sofa", category: "Furniture", quantity: 2, notes: "" },
      ],
    },
  ],
  pricing: { subtotal: 100, labor: 20, disposal: 5, discount: 0, total: 125 },
  breakdown: {
    subtotal: 125,
    grandTotal: 125,
    sections: [
      {
        key: "items",
        title: "Items",
        total: 125,
        lines: [
          { id: "sofa", label: "Sofa removal", amount: 125, quantity: 2 },
        ],
      },
    ],
  },
  status: "Viewed",
  approvalTokenExpiresAt: new Date("2026-09-30T12:00:00.000Z"),
};

afterEach(() => {
  cleanup();
  respond.mockReset();
});

describe("PublicEstimateApproval", () => {
  it("renders a readable, mobile-safe document and the approval CTA for a viewed estimate", () => {
    const { container } = render(
      <PublicEstimateApproval token="public-token" estimate={baseEstimate} />,
    );

    expect(screen.getByText("Acme Hauling")).toBeTruthy();
    expect(screen.getByText("Jamie Customer")).toBeTruthy();
    expect(screen.getByText("EST-1042")).toBeTruthy();
    expect(screen.getAllByText("$125.00")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Review & Sign Estimate" }),
    ).toBeTruthy();
    expect(container.querySelector("main")?.className).toContain(
      "[color-scheme:light]",
    );
    expect(container.querySelector("article")?.className).toContain(
      "max-w-3xl",
    );
    expect(
      screen.getByRole("button", { name: "Review & Sign Estimate" }).className,
    ).toContain("w-full");
    expect(container.querySelector('a[href^="/dashboard"]')).toBeNull();
    expect(container.querySelector('a[href^="/estimates"]')).toBeNull();
  });

  it("records approval through the existing action after collecting a name and signature", async () => {
    respond.mockResolvedValue({ status: "Approved" });
    render(
      <PublicEstimateApproval
        token="public-token"
        estimate={{ ...baseEstimate, status: "Sent" }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Signer full name"), {
      target: { value: "Jamie Customer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add signature" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Review & Sign Estimate" }),
    );

    await waitFor(() =>
      expect(respond).toHaveBeenCalledWith(
        "public-token",
        "approve",
        "Jamie Customer",
        "data:image/png;base64,signed",
      ),
    );
    expect(await screen.findByText("Estimate Approved")).toBeTruthy();
  });

  it.each([
    ["Approved", "Estimate Approved"],
    ["Declined", "Estimate Declined"],
  ] as const)(
    "renders %s as a read-only completed state",
    (status, heading) => {
      render(
        <PublicEstimateApproval
          token="public-token"
          estimate={{ ...baseEstimate, status }}
        />,
      );

      expect(screen.getByText(heading)).toBeTruthy();
      expect(
        screen.queryByRole("button", { name: "Review & Sign Estimate" }),
      ).toBeNull();
    },
  );

  it("handles missing optional company fields without exposing internal navigation", () => {
    render(
      <PublicEstimateApproval
        token="public-token"
        estimate={{
          ...baseEstimate,
          company: {
            ...baseEstimate.company,
            phone: null,
            email: null,
            website: null,
            logoUrl: null,
          },
        }}
      />,
    );

    expect(screen.getByText("Acme Hauling")).toBeTruthy();
    expect(screen.queryByText("hello@acme.test")).toBeNull();
    expect(screen.getByText("Powered by JunkQuote Pro")).toBeTruthy();
  });
});
