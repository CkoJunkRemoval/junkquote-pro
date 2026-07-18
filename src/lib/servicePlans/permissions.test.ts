import { describe, expect, it } from "vitest"; import { canAdministerServicePlans } from "./permissions";
describe("service plan permissions",()=>{it("allows operations staff and denies crew",()=>{for(const role of ["Owner","Admin","Manager","Office"] as const)expect(canAdministerServicePlans(role)).toBe(true);expect(canAdministerServicePlans("Crew")).toBe(false);});});
