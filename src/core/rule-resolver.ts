/**
 * Deterministic mapping between an ESLint rule id and the markdown file name
 * that documents how the project wants that rule handled.
 *
 * Rules:
 *   - "/"       becomes "__"
 *   - leading "@scope/plugin" becomes "scope__plugin" (drop the "@")
 *
 * Examples:
 *   no-console                            -> no-console.md
 *   eqeqeq                                -> eqeqeq.md
 *   @typescript-eslint/no-explicit-any    -> typescript-eslint__no-explicit-any.md
 *   react-hooks/exhaustive-deps           -> react-hooks__exhaustive-deps.md
 */
export function ruleIdToFileName(ruleId: string): string {
  if (!ruleId || typeof ruleId !== "string") {
    throw new Error("ruleIdToFileName: ruleId must be a non-empty string");
  }

  // Drop a leading "@" but keep the scope segment.
  const stripped = ruleId.startsWith("@") ? ruleId.slice(1) : ruleId;

  // Replace every slash with the double-underscore separator.
  const normalized = stripped.replace(/\//g, "__");

  return `${normalized}.md`;
}

/**
 * Resolve the markdown file path for a rule id, relative to the kbDir.
 * The kbDir itself is supplied by the caller (already resolved against the
 * project root).
 */
export function ruleIdToKbRelativePath(ruleId: string, kbDir: string): string {
  const normalizedKbDir = kbDir.replace(/\/+$/, "");
  return `${normalizedKbDir}/${ruleIdToFileName(ruleId)}`;
}
