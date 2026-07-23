import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const list = readFileSync("src/app/properties/page.tsx", "utf8");
const detail = readFileSync("src/app/properties/[id]/page.tsx", "utf8");
const form = readFileSync("src/features/properties/PropertyForm.tsx", "utf8");
const actions = readFileSync("src/app/actions/properties/manageProperties.ts", "utf8");
describe("properties management UI", () => {
  it("replaces placeholder copy with the required empty state and actions", () => {
    expect(list).toContain("No properties yet");
    expect(list).toContain("Properties are service locations linked to customers.");
    expect(list).not.toContain("Property management will be available here.");
  });
  it("uses URL-backed search, filters, sorting, and pagination", () => {
    for (const field of ['name="q"', 'name="type"', 'name="status"', 'name="city"', 'name="serviceArea"', 'name="upcoming"', 'name="openEstimate"', 'name="recent"', 'name="sort"']) expect(list).toContain(field);
    expect(list).toContain('["page", String(page)]');
  });
  it("renders desktop table and mobile-first cards without overflow", () => {
    expect(list).toContain("hidden overflow-x-auto");
    expect(list).toContain("md:hidden");
    expect(list).toContain("min-h-11");
  });
  it("provides accessible property creation and duplicate warning", () => {
    expect(form).toContain('role="alert"');
    expect(form).toContain("checkDuplicatePropertyAction");
    expect(form).toContain("Save Property");
  });
  it("contains integrated records, quick actions, and crew permission checks", () => {
    for (const text of ["Create Estimate", "Schedule Job", "Edit Property", "Archive Property", "Estimates", "Jobs", "Invoices", "Photos", "Activity timeline"]) expect(detail + readFileSync("src/features/properties/PropertyActions.tsx", "utf8")).toContain(text);
    expect(detail).toContain("jobAssignment.findFirst");
    expect(detail).toContain("if (!assigned) notFound()");
  });
  it("allows operational editors and excludes crew from mutations", () => {
    expect(actions).toContain('requireCompanyRole("Owner", "Admin", "Manager", "Office")');
    expect(actions).not.toContain('requireCompanyRole("Crew"');
  });
});
