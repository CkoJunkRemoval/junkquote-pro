import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { resolveEstimateIntent } from "./estimateIntent";

describe("new estimate intent", () => {
  it("makes explicit New Estimate override selected and persisted drafts", () => {
    expect(
      resolveEstimateIntent({
        explicitNew: true,
        explicitEstimateId: null,
        selectedEstimateId: "selected-old",
        persistedEstimateId: "persisted-old",
      }),
    ).toBe("new");
  });

  it("resumes only the explicitly selected draft when requested", () => {
    expect(
      resolveEstimateIntent({
        explicitNew: false,
        explicitEstimateId: "draft-a",
        selectedEstimateId: "draft-b",
        persistedEstimateId: "draft-c",
      }),
    ).toBe("draft-a");
  });

  it("falls back to a persisted draft only without explicit navigation intent", () => {
    expect(
      resolveEstimateIntent({
        explicitNew: false,
        explicitEstimateId: null,
        selectedEstimateId: null,
        persistedEstimateId: "draft-a",
      }),
    ).toBe("draft-a");
  });

  it("uses a distinct provider identity and preserves the one-create-at-a-time autosave guard", () => {
    const workflow = fs.readFileSync(
      path.join(process.cwd(), "src/features/estimate/NewEstimate.tsx"),
      "utf8",
    );
    const provider = fs.readFileSync(
      path.join(process.cwd(), "src/features/estimate/EstimateContext.tsx"),
      "utf8",
    );
    expect(workflow).toContain("key={`estimate-workflow:${resumeEstimateId}`}");
    expect(provider).toContain("creatingEstimateRef.current");
    expect(provider).toContain("if (!customerId || !propertyId)");
    expect(provider).toContain(
      'url.searchParams.set("estimateId", estimateId)',
    );
  });
});
