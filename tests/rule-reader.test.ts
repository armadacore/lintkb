import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { kbEntryExists } from "../src/core/rule-reader.js";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "lintkb-reader-"));
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("kbEntryExists", () => {
  it("returns false when file does not exist", () => {
    expect(kbEntryExists(".rules/no-console.md", tmpRoot)).toBe(false);
  });

  it("returns true when file exists", () => {
    mkdirSync(join(tmpRoot, ".rules"));
    writeFileSync(join(tmpRoot, ".rules", "no-console.md"), "# x");
    expect(kbEntryExists(".rules/no-console.md", tmpRoot)).toBe(true);
  });

  it("returns false when path points to a directory", () => {
    mkdirSync(join(tmpRoot, ".rules", "no-console.md"), { recursive: true });
    expect(kbEntryExists(".rules/no-console.md", tmpRoot)).toBe(false);
  });
});
