import { describe, expect, it } from "vitest";
import { createServiceWorker } from "./serviceWorker";

describe("service worker", () => {
  const source = createServiceWorker("build 123");
  it("uses a sanitized build cache and removes obsolete caches", () => {
    expect(source).toContain('const CACHE_PREFIX="junkquote-pwa"');
    expect(source).toContain('CACHE_PREFIX+"-build-123"');
    expect(source).toContain("caches.delete(key)");
  });
  it("never handles mutation requests and honors sensitive routes", () => {
    expect(source).toContain('request.method!=="GET"');
    expect(source).toContain("sensitivePath(url.pathname)");
    expect(source).toContain('request.headers.has("authorization")');
  });
  it("rejects private, no-store, redirected, and cookie responses", () => {
    expect(source).toContain("no-store|private");
    expect(source).toContain("!r.redirected");
    expect(source).toContain('r.headers.has("set-cookie")');
  });
});
