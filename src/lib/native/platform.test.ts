import { describe, expect, it } from "vitest";
import { isExternalWebUrl, nativeRouteFromUrl } from "./platform";

describe("native navigation policy", () => {
  it("maps only owned universal links and the app scheme", () => {
    expect(nativeRouteFromUrl("junkquote://dashboard?from=push")).toBe(
      "/dashboard?from=push",
    );
    expect(nativeRouteFromUrl("https://junkquoteprohq.com/estimates/1")).toBe(
      "/estimates/1",
    );
    expect(nativeRouteFromUrl("https://evil.example/estimates/1")).toBeNull();
    expect(nativeRouteFromUrl("javascript:alert(1)")).toBeNull();
  });
  it("recognizes external http links without intercepting same-origin links", () => {
    expect(
      isExternalWebUrl("https://stripe.com/pay", "https://junkquoteprohq.com"),
    ).toBe(true);
    expect(isExternalWebUrl("/dashboard", "https://junkquoteprohq.com")).toBe(
      false,
    );
    expect(
      isExternalWebUrl("mailto:test@example.com", "https://junkquoteprohq.com"),
    ).toBe(false);
  });
});
