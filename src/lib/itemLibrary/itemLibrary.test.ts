import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { normalizeItemLibraryQuery, validateItemLibraryInput, validateItemOverride } from "./itemLibrary";
import { DEFAULT_ITEM_LIBRARY } from "./defaultItems";

describe("Item Library validation", () => {
  it("accepts custom categories and production defaults", () => {
    expect(() => validateItemLibraryInput({ ...DEFAULT_ITEM_LIBRARY[0], category: "Custom Demo" })).not.toThrow();
  });
  it("rejects duplicate-risk inputs and invalid pricing/labor metadata", () => {
    expect(() => validateItemLibraryInput({ ...DEFAULT_ITEM_LIBRARY[0], name: "" })).toThrow("required");
    expect(() => validateItemLibraryInput({ ...DEFAULT_ITEM_LIBRARY[0], basePrice: -1 })).toThrow("zero or greater");
    expect(() => validateItemLibraryInput({ ...DEFAULT_ITEM_LIBRARY[0], laborHours: 0 })).toThrow("greater than zero");
    expect(() => validateItemLibraryInput({ ...DEFAULT_ITEM_LIBRARY[0], weightClass: "Huge" as never })).toThrow("weight class");
  });
  it("validates sparse overrides and bounded pagination", () => {
    expect(() => validateItemOverride({ basePrice: null, laborHours: .25, crewRequirement: 2 })).not.toThrow();
    expect(() => validateItemOverride({ crewRequirement: 0 })).toThrow("at least 1");
    expect(normalizeItemLibraryQuery({ page: -2, pageSize: 1000 })).toMatchObject({ page: 1, pageSize: 100, skip: 0 });
  });
});
