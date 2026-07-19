import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { findPhotos, findCompanies } = vi.hoisted(() => ({
  findPhotos: vi.fn(),
  findCompanies: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobPhoto: { findMany: findPhotos },
    company: { findMany: findCompanies },
  },
}));
import { migrateLocalAssets, reconcilePrivateAssets } from "./assetOperations";
import type { PrivateObjectStorage } from "./objectStorage";
class Memory implements PrivateObjectStorage {
  name = "memory";
  objects = new Map<string, Buffer>();
  async put(key: string, data: Buffer, type: string) {
    this.objects.set(key, data);
    return { key, size: data.length, contentType: type, etag: null };
  }
  async get(key: string) {
    const data = this.objects.get(key);
    return data
      ? {
          data,
          metadata: {
            key,
            size: data.length,
            contentType: "image/jpeg",
            etag: null,
          },
        }
      : null;
  }
  async exists(key: string) {
    return this.objects.has(key);
  }
  async delete(key: string) {
    this.objects.delete(key);
  }
  async healthCheck() {
    return true;
  }
  async metadata(key: string) {
    const data = this.objects.get(key);
    return data
      ? { key, size: data.length, contentType: "image/jpeg", etag: null }
      : null;
  }
  async list(prefix: string) {
    return [...this.objects]
      .filter(([k]) => k.startsWith(prefix))
      .map(([key, data]) => ({
        key,
        size: data.length,
        contentType: "image/jpeg",
        etag: null,
      }));
  }
}
describe("asset operations", () => {
  it("dry-runs and skips verified objects without writes", async () => {
    const source = new Memory();
    const target = new Memory();
    source.objects.set("job-photos/t/j/a.jpg", Buffer.from("one"));
    target.objects.set("job-photos/t/j/a.jpg", Buffer.from("one"));
    source.objects.set("job-photos/t/j/b.jpg", Buffer.from("two"));
    const report = await migrateLocalAssets({ dryRun: true, source, target });
    expect(report).toMatchObject({ examined: 2, skipped: 1, migrated: 1 });
    expect(target.objects.has("job-photos/t/j/b.jpg")).toBe(false);
  });
  it("reconciles missing references, orphans, and samples", async () => {
    findPhotos.mockResolvedValue([
      {
        fileUrl: "/api/private/assets/job-photos/t/j/a.jpg",
        thumbnailUrl: null,
      },
    ]);
    findCompanies.mockResolvedValue([]);
    const storage = new Memory();
    storage.objects.set("job-photos/t/j/orphan.jpg", Buffer.from("x"));
    const report = await reconcilePrivateAssets(storage);
    expect(report.missingReferences).toEqual(["job-photos/t/j/a.jpg"]);
    expect(report.orphanedObjects).toEqual(["job-photos/t/j/orphan.jpg"]);
    expect(report.healthy).toBe(false);
  });
});
