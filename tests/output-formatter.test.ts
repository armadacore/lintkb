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
  selfExplanatory: [],
};

const cfgWithSelfExplanatory: ResolvedConfig = {
  ...cfg,
  selfExplanatory: ["@typescript-eslint/no-unused-vars", "no-debugger"],
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

const findingUnusedVars: Finding = {
  filePath: "/tmp/does-not-exist-project/src/foo.ts",
  relativeFilePath: "src/foo.ts",
  line: 4,
  column: 9,
  ruleId: "@typescript-eslint/no-unused-vars",
  message: "'unused' is assigned a value but never used.",
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
      true,
    );
    expect(txt).toContain("No knowledge base entry exists");
    expect(txt).toContain("Ask the user");
  });

  it("Case C: no rule id", () => {
    const txt = buildAiInstruction(findingWithoutRule, null, false, true);
    expect(txt).toContain("no rule id");
  });

  it("Case D: self-explanatory rule", () => {
    const txt = buildAiInstruction(findingUnusedVars, null, false, false);
    expect(txt).toContain("self-explanatory");
    expect(txt).toContain("@typescript-eslint/no-unused-vars");
    expect(txt).toContain("Apply the fix directly");
  });
});

describe("enrichFindings", () => {
  it("computes kbPath, kbExists=false, kbRequired=true and aiInstruction", () => {
    const result = enrichFindings([findingWithRule], cfg);
    const f = result.findings[0]!;
    expect(f.kbFileName).toBe("typescript-eslint__no-explicit-any.md");
    expect(f.kbPath).toBe(".rules/typescript-eslint__no-explicit-any.md");
    expect(f.kbExists).toBe(false);
    expect(f.kbRequired).toBe(true);
    expect(f.aiInstruction).toContain("AI INSTRUCTION");
  });

  it("marks self-explanatory rules with kbRequired=false and skips KB lookup", () => {
    const result = enrichFindings(
      [findingWithRule, findingUnusedVars],
      cfgWithSelfExplanatory,
    );
    const explicitAny = result.findings[0]!;
    const unused = result.findings[1]!;

    expect(explicitAny.kbRequired).toBe(true);
    expect(explicitAny.kbPath).not.toBe(null);

    expect(unused.kbRequired).toBe(false);
    expect(unused.kbPath).toBe(null);
    expect(unused.kbFileName).toBe(null);
    expect(unused.kbExists).toBe(false);
    expect(unused.aiInstruction).toContain("self-explanatory");
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

  it("formatJson contains kbPath, kbExists, kbRequired, aiInstruction", () => {
    const result = enrichFindings(
      [findingWithRule, findingUnusedVars],
      cfgWithSelfExplanatory,
    );
    const parsed = JSON.parse(formatJson(result));
    expect(parsed.findings[0].kbPath).toBe(
      ".rules/typescript-eslint__no-explicit-any.md",
    );
    expect(parsed.findings[0].kbRequired).toBe(true);
    expect(parsed.findings[1].kbRequired).toBe(false);
    expect(parsed.findings[1].kbPath).toBe(null);
    expect(typeof parsed.findings[0].aiInstruction).toBe("string");
  });
});
