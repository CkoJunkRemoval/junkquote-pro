import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web manifest", () => {
  it("is installable and exposes required icons and shortcuts", () => {
    const value = manifest();
    expect(value).toMatchObject({
      name: "JunkQuote Pro",
      start_url: "/",
      scope: "/",
      display: "standalone",
    });
    expect(value.icons).toHaveLength(4);
    expect(
      value.icons?.filter((icon) => icon.purpose === "maskable"),
    ).toHaveLength(2);
    expect(value.shortcuts?.map((shortcut) => shortcut.name)).toEqual([
      "Dashboard",
      "New Estimate",
      "Today's Jobs",
      "Customers",
    ]);
  });
});
