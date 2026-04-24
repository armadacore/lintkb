import { describe, expect, it } from "vitest";
import {
  buildAiInstruction,
  enrichFindings,
  formatJson,
  formatText,
} from "../src/core/output-formatter.js";
import type { Finding, ResolvedConfig } from "../src/core/types.js";

const cfg: ResolvedConfig = {
  kbDir: ".rules",
  projectRoot: "/tmp/does-not-exist-project",
  kbDirAbsolute: "/tmp/does-not-exist-project/.rules",
};

const findingWithRule: Finding = {
  filePath: "/tmp/does-not-exist-project/src/foo.ts",
  relativeFilePath: "src/foo.ts",
  line: 12,
  column: 5,
  ruleId: "@typescript-eslint/no-explicit-any",
  message: "Unexpected any.",
  severity: "error",
};

const findingWithoutRule: Finding = {
  filePath: "/tmp/does-not-exist-project/src/parse.ts",
  relativeFilePath: "src/parse.ts",
  line: 1,
  column: 1,
  ruleId: null,
  message: "Parsing error",
  severity: "error",
};

describe("buildAiInstruction", () => {
  it("Case A: KB exists", () => {
    const txt = buildAiInstruction(
      findingWithRule,
      ".rules/typescript-eslint__no-explicit-any.md",
      true,
    );
    expect(txt).toContain("Read .rules/typescript-eslint__no-explicit-any.md");
    expect(txt).toContain("(src/foo.ts:12:5)");
  });

  it("Case B: KB missing", () => {
    const txt = buildAiInstruction(
      findingWithRule,
      ".rules/typescript-eslint__no-explicit-any.md",
      false,
    );
    expect(txt).toContain("No knowledge base entry exists");
    expect(txt).toContain("Ask the user");
    expect(txt).toContain(".rules/typescript-eslint__no-explicit-any.md");
  });

  it("Case C: no rule id", () => {
    const txt = buildAiInstruction(findingWithoutRule, null, false);
    expect(txt).toContain("no rule id");
  });
});

describe("enrichFindings", () => {
  it("computes kbPath, kbExists=false, and aiInstruction", () => {
    const result = enrichFindings([findingWithRule], cfg);
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0]!;
    expect(f.kbFileName).toBe("typescript-eslint__no-explicit-any.md");
    expect(f.kbPath).toBe(".rules/typescript-eslint__no-explicit-any.md");
    expect(f.kbExists).toBe(false);
    expect(f.aiInstruction).toContain("AI INSTRUCTION");
    expect(result.errorCount).toBe(1);
    expect(result.warningCount).toBe(0);
  });
});

describe("formatText / formatJson", () => {
  it("formatText produces a per-file block including AI INSTRUCTION", () => {
    const result = enrichFindings([findingWithRule], cfg);
    const text = formatText(result);
    expect(text).toContain("src/foo.ts");
    expect(text).toContain("@typescript-eslint/no-explicit-any");
    expect(text).toContain("AI INSTRUCTION");
    expect(text).toContain("lintkb: 1 finding(s)");
  });

  it("formatText handles zero findings", () => {
    const result = enrichFindings([], cfg);
    expect(formatText(result)).toContain("no findings");
  });

  it("formatJson contains kbPath, kbExists, aiInstruction", () => {
    const result = enrichFindings([findingWithRule], cfg);
    const parsed = JSON.parse(formatJson(result));
    expect(parsed.findings[0].kbPath).toBe(
      ".rules/typescript-eslint__no-explicit-any.md",
    );
    expect(parsed.findings[0].kbExists).toBe(false);
    expect(typeof parsed.findings[0].aiInstruction).toBe("string");
    expect(parsed.errorCount).toBe(1);
  });
});
