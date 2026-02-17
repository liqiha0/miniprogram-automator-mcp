import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  splitting: false,
  sourcemap: true,
  external: [
    /^miniprogram-automator/,
    /^@modelcontextprotocol\/sdk/,
    /^zod/,
  ],
});
