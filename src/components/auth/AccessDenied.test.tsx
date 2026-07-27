import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AccessDenied, { accessDeniedMessage } from "./AccessDenied";

describe("AccessDenied", () => {
  it("renders safe denial copy and recovery actions", () => {
    const html = renderToStaticMarkup(<AccessDenied />);
    expect(html).toContain(accessDeniedMessage);
    expect(html).toContain("Return to Dashboard");
    expect(html).toContain("Go Back");
    expect(html).not.toMatch(/companyId|fleet\.[a-z]/i);
  });

  it("uses keyboard-accessible touch-sized controls", () => {
    const html = renderToStaticMarkup(<AccessDenied />);
    expect(html).toContain("min-h-11");
    expect(html).toContain('type="button"');
    expect(html).toContain("focus-visible:ring-2");
  });
});
