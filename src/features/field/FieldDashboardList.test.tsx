import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FieldDashboardList from "./FieldDashboardList";

describe("field dashboard list", () => {
  it("renders a compact empty state instead of throwing", () => {
    const html = renderToStaticMarkup(
      <FieldDashboardList title="Today's Jobs" jobs={[]} />,
    );
    expect(html).toContain("Today&#x27;s Jobs");
    expect(html).toContain("(0)");
    expect(html).toContain("No jobs.");
  });
});
