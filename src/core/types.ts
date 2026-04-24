/**
 * Public types shared across lintkb.
 */

export interface LintkbConfig {
  /** Directory (relative to project root) holding the Markdown knowledge base. */
  kbDir: string;
  /** Optional explicit path to an ESLint flat config file. */
  eslintConfig?: string;
  /**
   * ESLint rule ids whose findings are considered self-explanatory.
   * For these rules no Markdown file in `kbDir` is required and the AI
   * instruction tells the agent to fix the finding directly based on the
   * ESLint message.
   *
   * Example: ["no-unused-vars", "@typescript-eslint/no-unused-vars"]
   */
  selfExplanatory?: string[];
  /**
   * Override the AI instruction text per case. Any field that is omitted
   * falls back to the built-in English default.
   *
   * Available variables (replaced with the finding's values):
   *   {ruleId}  {kbPath}  {file}  {line}  {column}
   *
   * Multi-line strings are supported. Lines are emitted exactly as written.
   */
  instructions?: InstructionTemplates;
}

export interface InstructionTemplates {
  /** Used when the KB entry exists on disk. */
  kbExists?: string;
  /** Used when the KB entry is missing on disk. */
  kbMissing?: string;
  /** Used when the rule is listed in `selfExplanatory`. */
  selfExplanatory?: string;
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
  /** Path to the markdown file relative to the project root. Null if ruleId is null or the rule is self-explanatory. */
  kbPath: string | null;
  /** Whether the markdown file actually exists on disk. */
  kbExists: boolean;
  /** Whether this rule requires a knowledge base entry. False for self-explanatory rules. */
  kbRequired: boolean;
  /** Human-readable AI INSTRUCTION block (English). */
  aiInstruction: string;
}

export interface LintRunResult {
  findings: EnrichedFinding[];
  errorCount: number;
  warningCount: number;
}
