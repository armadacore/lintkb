import { loadConfig } from "../../core/config.js";
import { runEslint } from "../../core/eslint-runner.js";
import {
  enrichFindings,
  formatJson,
  formatText,
} from "../../core/output-formatter.js";

export interface LintOptions {
  cwd?: string;
  format?: "text" | "json";
}

/**
 * Run ESLint on `targetPath` (relative to project root) and print the
 * lintkb-augmented output.
 *
 * Returns the process exit code (0 = no errors, 1 = at least one error).
 */
export async function runLint(
  targetPath: string,
  options: LintOptions = {},
): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const config = loadConfig(cwd);

  const findings = await runEslint(targetPath, config);
  const result = enrichFindings(findings, config);

  const out =
    (options.format ?? "text") === "json"
      ? formatJson(result)
      : formatText(result);

  process.stdout.write(out);
  if (!out.endsWith("\n")) process.stdout.write("\n");

  return result.errorCount > 0 ? 1 : 0;
}
