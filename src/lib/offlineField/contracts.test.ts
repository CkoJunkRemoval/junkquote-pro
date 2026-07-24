import { describe, expect, it } from "vitest";
import {
  OFFLINE_SCHEMA_VERSION,
  parseOfflineMutation,
  sortMutationsByDependencies,
} from "./contracts";

const mutation = (id: string, dependencies: string[] = []) => ({
  localMutationId: id,
  idempotencyKey: `key-${id}`,
  companyId: "company",
  userId: "user",
  jobId: "job",
  packageId: "package",
  mutationType: "JOB_FIELD_NOTE_ADD",
  payload: { note: "Safe field note" },
  baseRecordVersion: 1,
  dependencyIds: dependencies,
  createdAt: "2026-08-05T12:00:00.000Z",
  schemaVersion: OFFLINE_SCHEMA_VERSION,
});

describe("offline field contracts", () => {
  it("validates and orders dependencies", () => {
    const first = parseOfflineMutation(mutation("first"));
    const second = parseOfflineMutation(mutation("second", ["first"]));
    expect(sortMutationsByDependencies([second, first]).map((row) => row.localMutationId)).toEqual([
      "first",
      "second",
    ]);
  });

  it("rejects unsupported schemas and dependency cycles", () => {
    expect(() => parseOfflineMutation({ ...mutation("bad"), schemaVersion: 99 })).toThrow("schema");
    expect(() =>
      sortMutationsByDependencies([
        parseOfflineMutation(mutation("a", ["b"])),
        parseOfflineMutation(mutation("b", ["a"])),
      ]),
    ).toThrow("cycle");
  });
});
