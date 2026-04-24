import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "cli/index": "src/cli/index.ts",
  },
  format: ["esm"],
  target: "node20",
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  banner: ({ format }) => {
    // Add shebang only to the CLI entry. tsup banner applies per-format,
    // so we add it globally for ESM and rely on chmod via package.json.
    return { js: "" };
  },
  esbuildOptions(options) {
    options.platform = "node";
  },
  onSuccess: async () => {
    // Add shebang to the CLI bundle so it can be executed directly.
    const { readFile, writeFile, chmod } = await import("node:fs/promises");
    const cliPath = "dist/cli/index.js";
    try {
      const content = await readFile(cliPath, "utf8");
      if (!content.startsWith("#!")) {
        await writeFile(cliPath, `#!/usr/bin/env node\n${content}`);
      }
      await chmod(cliPath, 0o755);
    } catch {
      // ignore if file does not exist yet
    }
  },
});
