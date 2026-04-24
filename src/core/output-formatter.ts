import type {
  EnrichedFinding,
  Finding,
  LintRunResult,
  ResolvedConfig,
} from "./types.js";
import { kbEntryExists } from "./rule-reader.js";
import { ruleIdToFileName, ruleIdToKbRelativePath } from "./rule-resolver.js";

/**
 * Build the human-readable AI INSTRUCTION block (English) for a finding.
 *
 * Two cases:
 *   A) KB entry exists  -> tell the AI to read the file and apply the fix.
 *   B) KB entry missing -> tell the AI to ask the user, create the .md, then fix.
 *   C) ruleId is null   -> can't link to KB; instruct the AI to handle the
 *                          (usually fatal) message manually.
 */
export function buildAiInstruction(
  finding: Finding,
  kbPath: string | null,
  kbExists: boolean,
): string {
  const location = `${finding.relativeFilePath}:${finding.line}:${finding.column}`;

  if (!finding.ruleId || !kbPath) {
    return [
      `→ AI INSTRUCTION (${location}):`,
      `  This finding has no rule id (likely a parser or fatal error).`,
      `  Read the message above and resolve the underlying problem manually.`,
    ].join("\n");
  }

  if (kbExists) {
    return [
      `→ AI INSTRUCTION (${location}):`,
      `  Read ${kbPath} and apply the described fix to this finding.`,
    ].join("\n");
  }

  return [
    `→ AI INSTRUCTION (${location}):`,
    `  No knowledge base entry exists for rule "${finding.ruleId}".`,
    `  Ask the user how this rule should be handled in this project,`,
    `  then create ${kbPath} with the agreed solution and apply the fix`,
    `  to this finding. On the next lint run this entry will be reused.`,
  ].join("\n");
}

/**
 * Enrich raw findings with KB metadata + the AI INSTRUCTION block.
 */
export function enrichFindings(
  findings: Finding[],
  config: ResolvedConfig,
): LintRunResult {
  const enriched: EnrichedFinding[] = findings.map((f) => {
    let kbFileName: string | null = null;
    let kbPath: string | null = null;
    let kbExists = false;

    if (f.ruleId) {
      kbFileName = ruleIdToFileName(f.ruleId);
      kbPath = ruleIdToKbRelativePath(f.ruleId, config.kbDir);
      kbExists = kbEntryExists(kbPath, config.projectRoot);
    }

    const aiInstruction = buildAiInstruction(f, kbPath, kbExists);

    return {
      ...f,
      kbFileName,
      kbPath,
      kbExists,
      aiInstruction,
    };
  });

  const errorCount = enriched.filter((f) => f.severity === "error").length;
  const warningCount = enriched.filter((f) => f.severity === "warning").length;

  return { findings: enriched, errorCount, warningCount };
}

/**
 * Render the lint result as text in the lintkb output format.
 *
 * Layout per file:
 *
 *   <relativeFilePath>
 *     <line>:<col>  <severity>  <message>  <ruleId>
 *
 *     → AI INSTRUCTION (...):
 *       ...
 */
export function formatText(result: LintRunResult): string {
  if (result.findings.length === 0) {
    return "lintkb: no findings.\n";
  }

  // Group by file for readability.
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
 * and aiInstruction so an AI agent can consume it without parsing text.
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
