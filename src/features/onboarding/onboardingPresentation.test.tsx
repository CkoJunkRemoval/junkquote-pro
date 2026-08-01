import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SetupBanner from "./SetupBanner";
import OnboardingProgressChips from "./OnboardingProgressChips";

describe("onboarding launch presentation", () => {
  it("renders the setup banner as a dark, wrapping, keyboard-visible surface", () => {
    const html = renderToStaticMarkup(<SetupBanner completed={2} total={9} setupComplete={false} />);
    expect(html).toContain("bg-slate-950/90");
    expect(html).toContain("text-white");
    expect(html).toContain("min-h-11");
    expect(html).toContain("focus-visible:ring-2");
    expect(html).toContain("flex-wrap");
    expect(html).not.toContain("bg-blue-50");
  });

  it("renders complete, current, and incomplete progress chips with accessible links", () => {
    const html = renderToStaticMarkup(
      <OnboardingProgressChips
        sections={["profile", "branding", "pricing"]}
        completed={new Set(["profile"])}
        currentStep={2}
      />,
    );
    expect(html).toContain('data-state="complete"');
    expect(html).toContain('data-state="current"');
    expect(html).toContain('data-state="incomplete"');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("min-h-11");
    expect(html).toContain("focus-visible:ring-2");
    expect(html).not.toContain("bg-white");
  });
});
