import { existsSync, statSync } from "node:fs";
import { join, isAbsolute } from "node:path";

/**
 * Check whether a knowledge base markdown entry exists for the given
 * rule-relative path.
 *
 * @param kbRelativePath  Path of the markdown file relative to the project root
 *                        (e.g. ".rules/typescript-eslint__no-explicit-any.md").
 * @param projectRoot     Absolute path to the project root.
 */
export function kbEntryExists(
  kbRelativePath: string,
  projectRoot: string,
): boolean {
  const absolute = isAbsolute(kbRelativePath)
    ? kbRelativePath
    : join(projectRoot, kbRelativePath);

  if (!existsSync(absolute)) return false;
  try {
    return statSync(absolute).isFile();
  } catch {
    return false;
  }
}
