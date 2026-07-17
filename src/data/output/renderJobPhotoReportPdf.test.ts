import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/storage/jobPhotoStorage", () => ({ localJobPhotoStorage: { readDataUrl: vi.fn().mockResolvedValue(null) } }));
import { renderJobPhotoReportPdf } from "./renderJobPhotoReportPdf";

describe("job photo report", () => {
  it("renders a server-side report with grouped photo metadata", async () => {
    const pdf = await renderJobPhotoReportPdf({ company: { name: "JunkQuote Pro" }, customer: { firstName: "Jamie", lastName: "Smith" }, property: { address: "1 Main St", city: "Town", state: "NY", zip: "10001" }, scheduledStart: null, photos: [{ category: "Before", fileUrl: "/uploads/job-photos/a.jpg", caption: "Before" }, { category: "After", fileUrl: "/uploads/job-photos/b.jpg", caption: "After" }] } as never);
    expect(pdf.length).toBeGreaterThan(100);
  });
});
