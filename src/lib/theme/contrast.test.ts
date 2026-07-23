import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readableBrandForeground } from "@/lib/company/brandingColors";

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const rgb = (hex: string) =>
  [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
const luminance = (hex: string) =>
  rgb(hex)
    .map((channel) => {
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    })
    .reduce(
      (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
      0,
    );
const contrast = (foreground: string, background: string) => {
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
};

describe("shared theme contrast", () => {
  it("keeps light and system-dark white cards on an explicit AA foreground", () => {
    expect(css).toContain("--surface-foreground: #0f172a");
    expect(css).toContain(":where(.bg-white, .bg-slate-50)");
    expect(contrast("#0f172a", "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
  it("defines coherent system theme and form-control output", () => {
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain("color-scheme: dark");
    expect(css).toContain("color-scheme: light");
    expect(css).toContain("-webkit-text-fill-color: var(--input-foreground)");
  });
  it("chooses an AA-safe tenant brand foreground", () => {
    expect(readableBrandForeground("#ffffff")).toBe("#0f172a");
    expect(readableBrandForeground("#0f172a")).toBe("#ffffff");
    expect(readableBrandForeground("not-a-color")).toBe("#ffffff");
    expect(
      contrast(readableBrandForeground("#facc15"), "#facc15"),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
