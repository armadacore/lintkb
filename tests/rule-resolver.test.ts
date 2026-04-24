import { describe, expect, it } from "vitest";
import {
  ruleIdToFileName,
  ruleIdToKbRelativePath,
} from "../src/core/rule-resolver.js";

describe("ruleIdToFileName", () => {
  it("handles plain core rules", () => {
    expect(ruleIdToFileName("no-console")).toBe("no-console.md");
    expect(ruleIdToFileName("eqeqeq")).toBe("eqeqeq.md");
  });

  it("handles scoped plugin rules", () => {
    expect(ruleIdToFileName("@typescript-eslint/no-explicit-any")).toBe(
      "typescript-eslint__no-explicit-any.md",
    );
    expect(ruleIdToFileName("@typescript-eslint/no-unused-vars")).toBe(
      "typescript-eslint__no-unused-vars.md",
    );
  });

  it("handles unscoped plugin rules", () => {
    expect(ruleIdToFileName("react-hooks/exhaustive-deps")).toBe(
      "react-hooks__exhaustive-deps.md",
    );
    expect(ruleIdToFileName("react/jsx-key")).toBe("react__jsx-key.md");
  });

  it("throws on empty input", () => {
    expect(() => ruleIdToFileName("")).toThrow();
  });
});

describe("ruleIdToKbRelativePath", () => {
  it("joins kbDir and file name", () => {
    expect(
      ruleIdToKbRelativePath("@typescript-eslint/no-explicit-any", ".rules"),
    ).toBe(".rules/typescript-eslint__no-explicit-any.md");
  });

  it("strips trailing slashes from kbDir", () => {
    expect(ruleIdToKbRelativePath("no-console", ".rules/")).toBe(
      ".rules/no-console.md",
    );
  });
});
