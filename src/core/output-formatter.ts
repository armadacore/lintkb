import type {
  EnrichedFinding,
  Finding,
  InstructionTemplates,
  LintRunResult,
  ResolvedConfig,
} from "./types.js";
import { kbEntryExists } from "./rule-reader.js";
import { ruleIdToFileName, ruleIdToKbRelativePath } from "./rule-resolver.js";

/**
 * Built-in default AI instruction templates (English). Each template can be
 * overridden via `instructions.<case>` in `.lintkbrc.json`.
 *
 * Available variables: {ruleId} {kbPath} {file} {line} {column}
 */
export const DEFAULT_INSTRUCTION_TEMPLATES: Required<InstructionTemplates> = {
  kbExists: [
    "→ AI INSTRUCTION ({file}:{line}:{column}):",
    "  Read {kbPath} and apply the described fix to this finding.",
  ].join("\n"),
  kbMissing: [
    "→ AI INSTRUCTION ({file}:{line}:{column}):",
    `  No knowledge base entry exists for rule "{ruleId}".`,
    "  Ask the user how this rule should be handled in this project,",
    "  then create {kbPath} with the agreed solution and apply the fix",
    "  to this finding. On the next lint run this entry will be reused.",
  ].join("\n"),
  selfExplanatory: [
    "→ AI INSTRUCTION ({file}:{line}:{column}):",
    `  Rule "{ruleId}" is configured as self-explanatory.`,
    "  No knowledge base entry is required. Apply the fix directly based",
    "  on the ESLint message above.",
  ].join("\n"),
};

/**
 * Replace `{name}` placeholders in `template` with values from `vars`.
 * Unknown placeholders are left untouched so they remain visible in the
 * output and surface configuration mistakes early.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : match,
  );
}

/**
 * Build the human-readable AI INSTRUCTION block for a finding.
 *
 * Cases:
 *   A) KB entry exists                       -> `kbExists` template.
 *   B) KB entry missing                      -> `kbMissing` template.
 *   C) ruleId is null                        -> hardcoded fallback (parser/fatal errors).
 *   D) Rule is self-explanatory (configured) -> `selfExplanatory` template.
 *
 * `instructions` lets the caller override the templates for cases A, B, D.
 * Any field that is omitted falls back to `DEFAULT_INSTRUCTION_TEMPLATES`.
 */
export function buildAiInstruction(
  finding: Finding,
  kbPath: string | null,
  kbExists: boolean,
  kbRequired: boolean,
  instructions?: InstructionTemplates,
): string {
  const location = `${finding.relativeFilePath}:${finding.line}:${finding.column}`;

  // Case C: no rule id -> hardcoded, not user-configurable.
  if (!finding.ruleId) {
    return [
      `→ AI INSTRUCTION (${location}):`,
      `  This finding has no rule id (likely a parser or fatal error).`,
      `  Read the message above and resolve the underlying problem manually.`,
    ].join("\n");
  }

  const vars: Record<string, string> = {
    ruleId: finding.ruleId,
    kbPath: kbPath ?? "",
    file: finding.relativeFilePath,
    line: String(finding.line),
    column: String(finding.column),
  };

  const pickTemplate = (key: keyof InstructionTemplates): string =>
    instructions?.[key] ?? DEFAULT_INSTRUCTION_TEMPLATES[key];

  if (!kbRequired) {
    return renderTemplate(pickTemplate("selfExplanatory"), vars);
  }

  if (!kbPath) {
    // Rare safety net: ruleId present but no path could be resolved.
    return [
      `→ AI INSTRUCTION (${location}):`,
      `  Could not resolve a knowledge base path for "${finding.ruleId}".`,
      `  Resolve the underlying problem manually.`,
    ].join("\n");
  }

  return renderTemplate(
    pickTemplate(kbExists ? "kbExists" : "kbMissing"),
    vars,
  );
}

/**
 * Enrich raw findings with KB metadata + the AI INSTRUCTION block.
 */
export function enrichFindings(
  findings: Finding[],
  config: ResolvedConfig,
): LintRunResult {
  const selfExplanatory = new Set(config.selfExplanatory ?? []);
  const instructions = config.instructions;

  const enriched: EnrichedFinding[] = findings.map((f) => {
    let kbFileName: string | null = null;
    let kbPath: string | null = null;
    let kbExists = false;
    let kbRequired = true;

    if (f.ruleId && selfExplanatory.has(f.ruleId)) {
      kbRequired = false;
    }

    if (f.ruleId && kbRequired) {
      kbFileName = ruleIdToFileName(f.ruleId);
      kbPath = ruleIdToKbRelativePath(f.ruleId, config.kbDir);
      kbExists = kbEntryExists(kbPath, config.projectRoot);
    }

    const aiInstruction = buildAiInstruction(
      f,
      kbPath,
      kbExists,
      kbRequired,
      instructions,
    );

    return {
      ...f,
      kbFileName,
      kbPath,
      kbExists,
      kbRequired,
      aiInstruction,
    };
  });

  const errorCount = enriched.filter((f) => f.severity === "error").length;
  const warningCount = enriched.filter((f) => f.severity === "warning").length;

  return { findings: enriched, errorCount, warningCount };
}

/**
 * Render the lint result as text in the lintkb output format.
 */
export function formatText(result: LintRunResult): string {
  if (result.findings.length === 0) {
    return "lintkb: no findings.\n";
  }

  const byFile = new Map<string, EnrichedFinding[]>();
  for (const f of result.findings) {
    const list = byFile.get(f.relativeFilePath) ?? [];
    list.push(f);
    byFile.set(f.relativeFilePath, list);
  }

  const blocks: string[] = [];
  for (const [file, findings] of byFile) {
    const lines: string[] = [file];
    for (const f of findings) {
      const ruleId = f.ruleId ?? "(no-rule-id)";
      lines.push(
        `  ${f.line}:${f.column}  ${f.severity}  ${f.message}  ${ruleId}`,
      );
      lines.push("");
      lines.push(indent(f.aiInstruction, 2));
      lines.push("");
    }
    blocks.push(lines.join("\n"));
  }

  const summary =
    `\nlintkb: ${result.findings.length} finding(s) ` +
    `(${result.errorCount} error, ${result.warningCount} warning)\n`;

  return blocks.join("\n") + summary;
}

/**
 * Render the lint result as JSON. Each finding includes kbPath, kbExists,
 * kbRequired, and aiInstruction so an AI agent can consume it without parsing text.
 */
export function formatJson(result: LintRunResult): string {
  return JSON.stringify(
    {
      findings: result.findings,
      errorCount: result.errorCount,
      warningCount: result.warningCount,
    },
    null,
    2,
  );
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((l) => (l.length > 0 ? pad + l : l))
    .join("\n");
}
