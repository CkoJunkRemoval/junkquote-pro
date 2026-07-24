import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source = readFileSync(
  new URL("./DispatchCenter.tsx", import.meta.url),
  "utf8",
);
describe("dispatch presentation", () => {
  it("provides board, day, week, list, today, and unscheduled controls", () => {
    for (const text of [
      '["board", "day", "week", "list"]',
      "Today",
      "Unscheduled Jobs",
      "Schedule date",
    ])
      expect(source).toContain(text);
  });
  it("uses a chronological mobile agenda and minimum touch targets", () => {
    expect(source).toContain("md:hidden");
    expect(source).toContain("min-h-11");
    expect(source).toContain("Mobile chronological agenda");
  });
  it("supports browser Back for move sheets", () => {
    expect(source).toContain("pushState");
    expect(source).toContain("popstate");
    expect(source).toContain('aria-modal="true"');
  });
  it("offers drag and non-drag move workflows", () => {
    expect(source).toContain("draggable");
    expect(source).toContain("onDrop");
    expect(source).toContain("Move / assign");
    expect(source).toContain("Conflict preview");
  });
  it("persists harmless display preferences and density modes", () => {
    expect(source).toContain("localStorage");
    expect(source).toContain("compact");
    expect(source).toContain("comfortable");
    expect(source).toContain("expanded");
  });
  it("uses a stable schedule reference for age and defers preference hydration", () => {
    expect(source).not.toContain("Date.now()");
    expect(source).toContain("referenceTime");
    expect(source).toContain("queueMicrotask");
  });
});
