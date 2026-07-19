import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  safeObjectKey,
  selectObjectStorage,
  SupabaseObjectStorage,
} from "./objectStorage";
describe("private object storage", () => {
  it("builds tenant-safe keys and rejects traversal", () => {
    expect(safeObjectKey("job-photos", "tenant-a", "job-a", "file.jpg")).toBe(
      "job-photos/tenant-a/job-a/file.jpg",
    );
    expect(() => safeObjectKey("job-photos", "..")).toThrow();
  });
  it("selects local only outside production and Supabase in production", () => {
    expect(
      selectObjectStorage({
        NODE_ENV: "test",
        PRIVATE_ASSET_STORAGE_DRIVER: "local",
      }).name,
    ).toBe("local");
    expect(() =>
      selectObjectStorage({
        NODE_ENV: "production",
        PRIVATE_ASSET_STORAGE_DRIVER: "local",
      }),
    ).toThrow("disabled");
    expect(
      selectObjectStorage(
        {
          NODE_ENV: "production",
          PRIVATE_ASSET_STORAGE_DRIVER: "supabase",
          SUPABASE_STORAGE_URL: "https://storage.test",
          SUPABASE_SERVICE_ROLE_KEY: "secret",
          SUPABASE_STORAGE_BUCKET: "private",
        },
        vi.fn() as never,
      ).name,
    ).toBe("supabase");
  });
  it("maps private health and missing objects", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const storage = new SupabaseObjectStorage(
      "https://storage.test",
      "secret",
      "private",
      fetcher,
    );
    expect(await storage.healthCheck()).toBe(true);
    expect(await storage.get("job-photos/t/j/f.jpg")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
