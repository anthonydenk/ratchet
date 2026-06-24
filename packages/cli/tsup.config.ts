import { defineConfig } from "tsup";

export default defineConfig({
  banner: {
    js: "#!/usr/bin/env node",
  },
  clean: true,
  dts: true,
  entry: ["src/index.ts", "src/bin.ts"],
  format: ["esm"],
  sourcemap: true,
});
