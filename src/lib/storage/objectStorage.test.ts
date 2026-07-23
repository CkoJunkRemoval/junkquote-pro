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
  it("creates short-lived signed Supabase URLs without persisting them", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            signedURL:
              "/storage/v1/object/sign/private/company-logos/t/logo.png?token=fresh",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    const storage = new SupabaseObjectStorage(
      "https://storage.test",
      "secret",
      "private",
      fetcher,
    );
    const url = await storage.createSignedReadUrl(
      "company-logos/t/logo.png",
      60,
    );
    expect(url).toContain("token=fresh");
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("/object/sign/private/company-logos/t/logo.png"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ expiresIn: 60 }),
      }),
    );
  });
});
