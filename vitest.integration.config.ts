import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, "src"), "server-only": resolve(__dirname, "tests/server-only.stub.ts") } },
  test: {
    include: ["tests/integration/**/*.integration.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
