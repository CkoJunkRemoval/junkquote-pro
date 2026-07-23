import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardQuickActions, {
  isNewEstimateShortcut,
  NEW_ESTIMATE_HREF,
  routeToNewEstimate,
} from "./DashboardQuickActions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("dashboard quick actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the primary action when estimate creation is permitted", () => {
    const html = renderToStaticMarkup(
      <DashboardQuickActions canCreateEstimate />,
    );
    expect(html).toContain("New Estimate");
    expect(html).toContain('aria-label="Create new estimate"');
  });

  it("hides the action without estimate-create permission", () => {
    const html = renderToStaticMarkup(
      <DashboardQuickActions canCreateEstimate={false} />,
    );
    expect(html).not.toContain("Create new estimate");
  });

  it("routes directly to the estimate creation workflow and starts loading", () => {
    const push = vi.fn();
    const setRouting = vi.fn();
    routeToNewEstimate(push, setRouting);
    expect(setRouting).toHaveBeenCalledWith(true);
    expect(push).toHaveBeenCalledWith(NEW_ESTIMATE_HREF);
  });

  it("supports N and Ctrl+Shift+N shortcuts", () => {
    const event = (overrides: Partial<KeyboardEvent> = {}) =>
      ({
        key: "n",
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        target: null,
        ...overrides,
      }) as KeyboardEvent;
    expect(isNewEstimateShortcut(event())).toBe(true);
    expect(
      isNewEstimateShortcut(event({ ctrlKey: true, shiftKey: true })),
    ).toBe(true);
    expect(isNewEstimateShortcut(event({ ctrlKey: true }))).toBe(false);
  });

  it("keeps search and the 44px action visible in the mobile layout", () => {
    const html = renderToStaticMarkup(
      <DashboardQuickActions canCreateEstimate />,
    );
    expect(html).toContain("grid w-full gap-3");
    expect(html).toContain("min-h-11");
    expect(html).toContain("Search customers, estimates, jobs...");
    expect(html).not.toMatch(/class="[^"]*\bhidden\b/);
  });
});
