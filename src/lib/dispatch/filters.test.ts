import { describe,expect,it } from "vitest";
import { parseDispatchFilters } from "./filters";
describe("dispatch URL filters",()=>{
  it("parses supported views and bounded filters",()=>expect(parseDispatchFilters({view:"week",status:"Confirmed",city:" Richmond ",conflictOnly:"1",page:"2"})).toMatchObject({view:"week",status:"Confirmed",city:"Richmond",conflictOnly:true,page:2}));
  it("falls back safely for invalid URL values",()=>expect(parseDispatchFilters({view:"month",status:"Invalid",page:"-4"})).toMatchObject({view:"day",status:undefined,page:1}));
});
