import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("authenticated theme contrast contract", () => {
  it("maps common light cards and semantic surfaces to readable dark app surfaces", () => {
    const css = read("src/app/globals.css");
    expect(css).toContain(".bg-slate-100");
    expect(css).toContain(".bg-gray-100");
    expect(css).toContain(".app-shell :where(.bg-blue-50, .bg-blue-100)");
    expect(css).toContain("--branded-surface-foreground: #f8fafc");
  });

  it("keeps signature capture white with a dark pen and the public approval document light", () => {
    const pad = read("src/components/estimate/SignaturePad.tsx");
    const approval = read(
      "src/features/estimate/public/PublicEstimateApproval.tsx",
    );
    expect(pad).toContain("signature-pad-surface");
    expect(pad).toContain('ctx.strokeStyle = "#0f172a"');
    expect(approval).toContain("[color-scheme:light]");
  });
});
