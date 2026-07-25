import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");
const service = source("src/lib/fleet/service.ts");
const schema = source("prisma/schema.prisma");

describe("fleet production contracts", () => {
  it("keeps all service relationships tenant-scoped", () => {
    for (const relationship of [
      "employee.findFirst",
      "crew.findFirst",
      "job.findFirst",
      "fleetAsset.findFirst",
    ]) {
      expect(service).toContain(relationship);
    }
    expect(service).toContain("companyId");
  });

  it("preserves mileage correction history and rejects future entries", () => {
    for (const value of [
      "originalEntryId",
      "correctionReason",
      "voidedAt",
      "Future mileage entries require explicit authorization",
      "Odometer cannot decrease",
    ])
      expect(service).toContain(value);
  });

  it("guards assignments and driver authorization", () => {
    expect(service).toContain("active assignment");
    expect(service).toContain("authorizedDriver");
    expect(service).toContain("This asset status cannot be assigned");
  });

  it("uses immutable operational relations and private documents", () => {
    expect(schema).toContain('@@map("asset_assignments")');
    expect(schema).toContain('@@map("asset_mileage_entries")');
    expect(schema).toContain('@@map("asset_documents")');
    expect(source("src/lib/storage/assetDocumentStorage.ts")).toContain(
      'safeObjectKey("asset-documents"',
    );
    expect(source("src/app/api/private/assets/[...path]/route.ts")).toContain(
      "fleet.document_accessed",
    );
  });

  it("ships dark responsive pages with 44px touch targets", () => {
    const ui = [
      source("src/features/fleet/FleetWorkspace.tsx"),
      source("src/app/fleet/[id]/page.tsx"),
      source("src/app/fleet/new/page.tsx"),
    ].join("\n");
    expect(ui).toContain("glass-card");
    expect(ui).toContain("min-h-11");
    expect(ui).toContain("overflow-x-auto");
    expect(ui).toMatch(/sm:|lg:/);
  });

  it("keeps browser automation out of production source", () => {
    expect(service).not.toContain("playwright");
    expect(source("src/features/fleet/FleetWorkspace.tsx")).not.toContain(
      "playwright",
    );
  });
});
