import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import BrandedAuthLayout from "./BrandedAuthLayout";
import BrandedPageShell from "./BrandedPageShell";
import GlassCard from "./GlassCard";

describe("visual refresh shared structure", () => {
  const styles = readFileSync(
    new URL("../../app/globals.css", import.meta.url),
    "utf8",
  );

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

  it("defines explicit foreground contracts for light and dark surfaces", () => {
    expect(styles).toContain("--surface-light:");
    expect(styles).toContain("--text-on-light:");
    expect(styles).toContain("--surface-dark:");
    expect(styles).toContain("--text-on-dark:");
    expect(styles).toContain(".surface-warning");
  });

  it("keeps login values, placeholders, autofill, disabled and error states readable", () => {
    expect(styles).toContain(".auth-field input::placeholder");
    expect(styles).toContain(".auth-field input:-webkit-autofill");
    expect(styles).toContain(".auth-field input:disabled");
    expect(styles).toContain('.auth-field input[aria-invalid="true"]');
  });
});
