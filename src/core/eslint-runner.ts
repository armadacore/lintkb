import { ESLint } from "eslint";
import { relative, resolve } from "node:path";
import type { Finding, FindingSeverity, ResolvedConfig } from "./types.js";

/**
 * Run ESLint programmatically and return a normalized list of findings.
 *
 * - Uses ESLint flat config (default in ESLint 9+).
 * - If `config.eslintConfig` is set, it is passed as `overrideConfigFile`.
 * - Otherwise, ESLint's normal auto-discovery applies.
 */
export async function runEslint(
  targetPath: string,
  config: ResolvedConfig,
): Promise<Finding[]> {
  const absoluteTarget = resolve(config.projectRoot, targetPath);

  const eslint = new ESLint({
    cwd: config.projectRoot,
    overrideConfigFile: config.eslintConfig
      ? resolve(config.projectRoot, config.eslintConfig)
      : undefined,
  });

  const results = await eslint.lintFiles([absoluteTarget]);

  const findings: Finding[] = [];
  for (const result of results) {
    for (const msg of result.messages) {
      // ESLint can emit fatal parsing errors with no rule id; we still surface
      // them so the AI sees the parse problem, but kbFileName will be null.
      const severity: FindingSeverity = msg.severity === 2 ? "error" : "warning";
      findings.push({
        filePath: result.filePath,
        relativeFilePath: relative(config.projectRoot, result.filePath),
        line: msg.line ?? 0,
        column: msg.column ?? 0,
        ruleId: msg.ruleId ?? null,
        message: msg.message,
        severity,
      });
    }
  }

  return findings;
}
