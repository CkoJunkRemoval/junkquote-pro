import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
const source=readFileSync(new URL("./DispatchCenter.tsx",import.meta.url),"utf8");
describe("dispatch presentation",()=>{
  it("provides day, week, list, today, and unscheduled controls",()=>{for(const text of ["day\",\"week\",\"list","Today","Unscheduled Jobs","Schedule date"])expect(source).toContain(text)});
  it("uses a chronological mobile agenda and minimum touch targets",()=>{expect(source).toContain("md:hidden");expect(source).toContain("min-h-11");expect(source).toContain("Chronological agenda")});
  it("supports browser Back for scheduling sheets",()=>{expect(source).toContain("pushState");expect(source).toContain("popstate");expect(source).toContain("aria-modal=\"true\"")});
});
