import { describe, expect, it } from "vitest";
import { buildJobPhotoStoragePrefix, sanitizeJobPhotoFilename } from "./jobPhotoStorage";

describe("job photo storage paths", () => {
  it("builds tenant and job owned private prefixes on the server", () => expect(buildJobPhotoStoragePrefix("tenant-a", "job-a")).toBe("/api/private/assets/job-photos/tenant-a/job-a/"));
  it("rejects traversal in ownership segments", () => { expect(() => buildJobPhotoStoragePrefix("../tenant-b", "job-a")).toThrow("Invalid company ID"); expect(() => buildJobPhotoStoragePrefix("tenant-a", "../job-b")).toThrow("Invalid job ID"); });
  it("sanitizes client filenames without retaining path components", () => expect(sanitizeJobPhotoFilename("../../private/<before>.jpg")).toBe("_before_.jpg"));
});
