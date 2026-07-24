import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BrandedAuthLayout from "./BrandedAuthLayout";
import BrandedPageShell from "./BrandedPageShell";
import GlassCard from "./GlassCard";

describe("visual refresh shared structure", () => {
  it("keeps authentication content inside the branded accessible layout", () => {
    const html = renderToStaticMarkup(
      <BrandedAuthLayout>
        <form aria-label="Sign in" />
      </BrandedAuthLayout>,
    );

    expect(html).toContain('class="auth-shell"');
    expect(html).toContain("Built for");
    expect(html).toContain('aria-label="Sign in"');
  });

  it("renders the offline-safe CSS background and shared glass hook", () => {
    const html = renderToStaticMarkup(
      <BrandedPageShell>
        <GlassCard>Content</GlassCard>
      </BrandedPageShell>,
    );

    expect(html).toContain("branded-background");
    expect(html).toContain("glass-card");
    expect(html).toContain("Content");
  });
});
