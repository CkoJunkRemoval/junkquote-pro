import { describe, expect, it } from "vitest";
import { createZip } from "./zip";

describe("tax export ZIP", () => {
  it("creates a valid ZIP envelope containing named files", () => {
    const archive = createZip([{ name: "expenses.csv", content: "id,total\r\n1,20" }]);
    expect(Array.from(archive.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(new TextDecoder().decode(archive)).toContain("expenses.csv");
    expect(Array.from(archive.slice(-22, -18))).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });
});
