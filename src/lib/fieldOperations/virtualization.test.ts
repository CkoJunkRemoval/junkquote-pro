import {describe,expect,it} from "vitest";
import {virtualRange} from "./virtualization";
describe("field list virtualization",()=>{it("does not virtualize short accessible lists",()=>expect(virtualRange({count:20,scrollTop:0,viewportHeight:500,rowHeight:50}).virtualized).toBe(false));it("bounds realistic large datasets",()=>{const value=virtualRange({count:10_000,scrollTop:125_000,viewportHeight:600,rowHeight:50});expect(value.virtualized).toBe(true);expect(value.end-value.start).toBeLessThan(30);expect(value.totalHeight).toBe(500_000)});});
