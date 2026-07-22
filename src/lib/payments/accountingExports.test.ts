import {describe,expect,it,vi} from "vitest";
vi.mock("@/lib/prisma",()=>({prisma:{}}));
import {formatAccountingCsv} from "./accountingExports";
describe("accounting exports",()=>{it("escapes QuickBooks-ready CSV values",()=>expect(formatAccountingCsv([["Name","Amount"],["Smith, \"Co\"",12.5]])).toBe('"Name","Amount"\r\n"Smith, ""Co""","12.5"'))});
