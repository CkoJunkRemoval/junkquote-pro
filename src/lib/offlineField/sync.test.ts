import { describe, expect, it } from "vitest";
import { deriveConnectivityState } from "./sync";

describe("offline field connectivity", () => {
  it("prioritizes sync, conflict, failure, pending, then online", () => {
    expect(deriveConnectivityState({ reachable: true, checking: false, syncing: true, pending: 1, conflicts: 0, failed: 0 })).toBe("Syncing");
    expect(deriveConnectivityState({ reachable: true, checking: false, syncing: false, pending: 1, conflicts: 1, failed: 0 })).toBe("Conflict");
    expect(deriveConnectivityState({ reachable: true, checking: false, syncing: false, pending: 1, conflicts: 0, failed: 0 })).toBe("Changes Pending");
    expect(deriveConnectivityState({ reachable: true, checking: false, syncing: false, pending: 0, conflicts: 0, failed: 0 })).toBe("Online");
  });
});
