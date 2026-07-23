import { describe, expect, it } from "vitest";
import { exportItemLibraryCsv, previewItemLibraryCsv } from "./csv";
import type { ItemLibraryInput } from "./types";

const item: ItemLibraryInput = {
  category: "Custom Category", name: 'Desk, "Large"', description: "Office desk",
  active: true, displayOrder: 1, basePrice: 55, disposalFee: 5, laborHours: .5,
  weightClass: "Medium", estimatedVolume: 8, recyclable: true, donationEligible: true,
  hazardous: false, refrigerant: false, electronics: false, mattress: false, tire: false,
  appliance: false, constructionDebris: false, yardWaste: false, requiresTwoPeople: false,
  requiresDisassembly: true, requiresSpecialEquipment: false, notes: "Handle carefully",
};

describe("Item Library CSV", () => {
  it("round trips quoted values and custom categories", () => {
    const result = previewItemLibraryCsv(exportItemLibraryCsv([item]));
    expect(result.errors).toEqual([]);
    expect(result.items[0]).toMatchObject({ name: item.name, category: "Custom Category", basePrice: 55, recyclable: true });
  });

  it("reports missing fields, duplicates and invalid numbers before import", () => {
    expect(previewItemLibraryCsv("name,basePrice\nChair,10").errors[0]).toContain("Missing required columns");
    const csv = exportItemLibraryCsv([item]);
    expect(previewItemLibraryCsv(csv, [{ category: item.category, name: item.name }]).errors[0]).toContain("duplicate active item");
    expect(previewItemLibraryCsv(csv.replace('"0.5"', '"-1"')).errors[0]).toContain("invalid");
  });
});
