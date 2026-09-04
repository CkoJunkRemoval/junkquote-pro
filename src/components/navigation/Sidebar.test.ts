import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("authenticated sidebar contracts", () => {
  it("defaults new and legacy desktop sessions to expanded", () => {
    const layout = source("src/components/layout/AppLayout.tsx");

    expect(layout).toContain('"junkquote:sidebar-collapsed:user-v1"');
    expect(layout).not.toContain('getItem("junkquote:sidebar-collapsed")');
    expect(layout).toContain("() => false");
  });

  it("persists only an explicit toggle using the current preference key", () => {
    const layout = source("src/components/layout/AppLayout.tsx");

    expect(layout).toContain(
      "localStorage.setItem(SIDEBAR_COLLAPSED_PREFERENCE_KEY, String(next))",
    );
    expect(layout).toContain('dispatchEvent(new Event("junkquote:sidebar"))');
  });

  it("keeps desktop labels visible and mobile labels unaffected", () => {
    const sidebar = source("src/components/navigation/Sidebar.tsx");

    expect(sidebar).toContain('collapsed ? "lg:w-20" : "lg:w-[17rem]"');
    expect(sidebar).toContain('collapsed ? "lg:sr-only" : ""');
    expect(sidebar).toContain("whitespace-normal leading-5");
    expect(sidebar).toContain("title={collapsed ? label : undefined}");
    expect(sidebar).toContain('className="fixed inset-0 z-30');
  });

  it("retains specific nested-route active matching", () => {
    const sidebar = source("src/components/navigation/Sidebar.tsx");

    expect(sidebar).toContain("moreSpecificItemMatches");
    expect(sidebar).toContain("&& !moreSpecificItemMatches");
  });
});
