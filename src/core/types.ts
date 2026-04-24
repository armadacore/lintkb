/**
 * Public types shared across lintkb.
 */

export interface LintkbConfig {
  /** Directory (relative to project root) holding the Markdown knowledge base. */
  kbDir: string;
  /** Optional explicit path to an ESLint flat config file. */
  eslintConfig?: string;
}

export interface ResolvedConfig extends LintkbConfig {
  /** Absolute path to the project root that contains .lintkbrc.json (or cwd if none). */
  projectRoot: string;
  /** Absolute path to the resolved kbDir. */
  kbDirAbsolute: string;
}

export type FindingSeverity = "error" | "warning";

export interface Finding {
  filePath: string;
  /** Project-relative file path, used for human-readable output. */
  relativeFilePath: string;
  line: number;
  column: number;
  ruleId: string | null;
  message: string;
  severity: FindingSeverity;
}

export interface EnrichedFinding extends Finding {
  /** Normalized markdown file name (e.g. "typescript-eslint__no-explicit-any.md"). */
  kbFileName: string | null;
  /** Path to the markdown file relative to the project root. Null if ruleId is null. */
  kbPath: string | null;
  /** Whether the markdown file actually exists on disk. */
  kbExists: boolean;
  /** Human-readable AI INSTRUCTION block (English). */
  aiInstruction: string;
}

export interface LintRunResult {
  findings: EnrichedFinding[];
  errorCount: number;
  warningCount: number;
}
