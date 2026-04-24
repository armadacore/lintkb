import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CONFIG_FILENAME,
  DEFAULT_CONFIG,
  findProjectRoot,
  loadConfig,
} from "../src/core/config.js";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "lintkb-config-"));
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("findProjectRoot", () => {
  it("returns null when no config is found", () => {
    expect(findProjectRoot(tmpRoot)).toBe(null);
  });

  it("finds config in the same directory", () => {
    writeFileSync(join(tmpRoot, CONFIG_FILENAME), "{}");
    expect(findProjectRoot(tmpRoot)).toBe(resolve(tmpRoot));
  });
});

describe("loadConfig", () => {
  it("returns defaults when no config exists", () => {
    const cfg = loadConfig(tmpRoot);
    expect(cfg.kbDir).toBe(DEFAULT_CONFIG.kbDir);
    expect(cfg.projectRoot).toBe(resolve(tmpRoot));
    expect(cfg.kbDirAbsolute).toBe(resolve(tmpRoot, DEFAULT_CONFIG.kbDir));
  });

  it("merges user config over defaults", () => {
    writeFileSync(
      join(tmpRoot, CONFIG_FILENAME),
      JSON.stringify({ kbDir: "knowledge" }),
    );
    const cfg = loadConfig(tmpRoot);
    expect(cfg.kbDir).toBe("knowledge");
    expect(cfg.kbDirAbsolute).toBe(resolve(tmpRoot, "knowledge"));
  });

  it("loads selfExplanatory rule list", () => {
    writeFileSync(
      join(tmpRoot, CONFIG_FILENAME),
      JSON.stringify({
        selfExplanatory: ["no-debugger", "@typescript-eslint/no-unused-vars"],
      }),
    );
    const cfg = loadConfig(tmpRoot);
    expect(cfg.selfExplanatory).toEqual([
      "no-debugger",
      "@typescript-eslint/no-unused-vars",
    ]);
  });

  it("defaults selfExplanatory to empty array", () => {
    const cfg = loadConfig(tmpRoot);
    expect(cfg.selfExplanatory).toEqual([]);
  });

  it("throws on invalid JSON", () => {
    writeFileSync(join(tmpRoot, CONFIG_FILENAME), "{not-json");
    expect(() => loadConfig(tmpRoot)).toThrow(/Failed to parse/);
  });
});
