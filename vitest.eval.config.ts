import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@ratchet/core": fromRoot("./packages/core/src/index.ts"),
      "@ratchet/schema": fromRoot("./packages/schema/src/index.ts"),
    },
  },
  test: {
    include: ["evals/**/*.eval.ts"],
    exclude: ["evals/**/*.live.eval.ts"],
  },
});
