import { beforeEach, describe, expect, it } from "vitest";
import { DevelopmentMemoryStore, setCoordinationStoreForTests } from "@/lib/distributed/store";
import { getLoginLockout, recordFailedLogin, resetLoginLockout } from "./loginLockout";

describe("login lockout", () => {
  beforeEach(() => setCoordinationStoreForTests(new DevelopmentMemoryStore()));
  it("locks after repeated normalized-email failures and resets on success", async () => {
    for (let index = 0; index < 5; index++) await recordFailedLogin(index % 2 ? " USER@Example.com " : "user@example.com");
    expect((await getLoginLockout("user@example.com")).locked).toBe(true);
    await resetLoginLockout("USER@example.com");
    expect((await getLoginLockout("user@example.com")).locked).toBe(false);
  });
});
