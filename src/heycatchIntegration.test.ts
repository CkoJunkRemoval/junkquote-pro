import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import config from "../next.config";

const source = fs.readFileSync(path.join(process.cwd(), "src/instrumentation-client.ts"), "utf8");

describe("HeyCatch integration", () => {
  it("initializes once at module scope with documented Next.js metadata", () => {
    expect(source.match(/analytics\.init\(/g)).toHaveLength(1);
    expect(source).toContain('projectKey: "hck_pk_7fTNbvNPwPoPhO06UCYSvETQxeUS-_cF"');
    expect(source).toContain('framework: "nextjs"');
    expect(source).toContain('frameworkVersion: "16"');
    expect(source).toContain('agent: "codex"');
    expect(source).not.toContain("trackEvent");
    expect(source).not.toContain("setIdentity");
  });

  it("redirects reserved one-character paths with attribution intact", async () => {
    await expect(config.redirects?.()).resolves.toContainEqual({
      source: "/:l([a-z0-9])",
      destination: "/?utm_source=heycatch&utm_campaign=:l",
      permanent: false,
    });
  });
});
