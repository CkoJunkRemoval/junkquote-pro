import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { clearGlobalSearchHistory, historyKey, isLatestSearchRequest, readSearchHistory, writeSearchHistory } from "./globalSearchHistory";

function storage() {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; }, key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  } as unknown as Storage;
}
describe("global search experience", () => {
  it("keeps only five tenant/user-scoped recent terms and clears them on logout", () => {
    const store = storage();
    for (const term of ["one", "two", "three", "four", "five", "six"]) writeSearchHistory(store, "scope-a", term);
    store.setItem("unrelated", "keep");
    expect(readSearchHistory(store, "scope-a")).toEqual(["six", "five", "four", "three", "two"]);
    expect(historyKey("scope-a")).not.toBe(historyKey("scope-b"));
    clearGlobalSearchHistory(store);
    expect(store.getItem(historyKey("scope-a"))).toBeNull();
    expect(store.getItem("unrelated")).toBe("keep");
  });
  it("identifies stale responses for cancellation", () => {
    expect(isLatestSearchRequest(2, 3)).toBe(false);
    expect(isLatestSearchRequest(3, 3)).toBe(true);
  });
  it("contains loading, error, no-result, grouping, accessibility, and mobile sheet states", () => {
    const source = readFileSync("src/components/navigation/GlobalSearch.tsx", "utf8");
    for (const text of ["Searching…", "Search is temporarily unavailable.", "No results found for", "Recent searches", 'role="search"', 'aria-live="polite"', "min-h-11", "fixed inset-0", "md:absolute", "100dvh", "motion-reduce:animate-none"]) expect(source).toContain(text);
    expect(source).not.toContain("request !== sequence.current");
    expect(source).toContain("isLatestSearchRequest");
  });
  it("uses the shared field in both header variants without changing New Estimate", () => {
    const header = readFileSync("src/components/navigation/Header.tsx", "utf8"), dashboard = readFileSync("src/components/navigation/DashboardQuickActions.tsx", "utf8");
    expect(header).toContain("<GlobalSearch />");
    expect(dashboard).toContain("<GlobalSearch dashboard />");
    expect(dashboard).toContain("New Estimate");
    expect(header).toContain("clearGlobalSearchHistory(localStorage)");
  });
});
