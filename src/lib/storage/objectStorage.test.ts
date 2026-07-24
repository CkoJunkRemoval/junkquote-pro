import { describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
  it("normalizes a configured relative local storage root", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "junkquote-storage-"));
    const relative = path.relative(process.cwd(), directory);
    try {
      const storage = selectObjectStorage({
        NODE_ENV: "test",
        PRIVATE_ASSET_STORAGE_DRIVER: "local",
        PRIVATE_ASSET_STORAGE_ROOT: relative,
      });
      await expect(
        storage.put("job-photos/tenant/job/photo.png", Buffer.from("photo"), "image/png"),
      ).resolves.toMatchObject({ size: 5 });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
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
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          signedURL:
            "/object/sign/private/company-logos/t/logo.png?token=fresh",
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
    expect(new URL(url!).pathname).toBe(
      "/storage/v1/object/sign/private/company-logos/t/logo.png",
    );
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("/object/sign/private/company-logos/t/logo.png"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ expiresIn: 60 }),
      }),
    );
  });
  it("does not duplicate storage/v1 when the configured URL already contains it", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            signedURL:
              "/object/sign/private/company-logos/t/logo.png?token=fresh",
          }),
          { status: 200 },
        ),
      );
    const storage = new SupabaseObjectStorage(
      "https://storage.test/storage/v1",
      "secret",
      "private",
      fetcher,
    );
    expect(
      new URL(
        (await storage.createSignedReadUrl("company-logos/t/logo.png", 60))!,
      ).pathname,
    ).toBe("/storage/v1/object/sign/private/company-logos/t/logo.png");
    expect(fetcher.mock.calls[0][0]).not.toContain("/storage/v1/storage/v1/");
  });
});
