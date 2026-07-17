import { describe, expect, it } from "vitest";
import { retryDelayMs } from "./backoff";
describe("background job backoff", () => { it("uses capped exponential backoff", () => { expect(retryDelayMs(1)).toBe(1_000); expect(retryDelayMs(2)).toBe(2_000); expect(retryDelayMs(4)).toBe(8_000); expect(retryDelayMs(100)).toBe(3_600_000); }); });
