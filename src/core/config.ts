import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { LintkbConfig, ResolvedConfig } from "./types.js";

export const CONFIG_FILENAME = ".lintkbrc.json";

export const DEFAULT_CONFIG: LintkbConfig = {
  kbDir: ".rules",
};

/**
 * Walk up from `startDir` until we find a `.lintkbrc.json`, or until we hit
 * the filesystem root.
 *
 * Returns the directory that contains the config file, or null if none was
 * found.
 */
export function findProjectRoot(startDir: string): string | null {
  let current = resolve(startDir);
  while (true) {
    if (existsSync(join(current, CONFIG_FILENAME))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * Load and resolve the lintkb configuration.
 *
 * - If a `.lintkbrc.json` exists at or above `cwd`, its directory becomes the
 *   project root and the config is parsed.
 * - Otherwise, `cwd` is used as the project root and defaults are applied.
 */
export function loadConfig(cwd: string): ResolvedConfig {
  const found = findProjectRoot(cwd);
  const projectRoot = found ?? resolve(cwd);

  let userConfig: Partial<LintkbConfig> = {};
  if (found) {
    const configPath = join(found, CONFIG_FILENAME);
    const raw = readFileSync(configPath, "utf8");
    try {
      userConfig = JSON.parse(raw) as Partial<LintkbConfig>;
    } catch (err) {
      throw new Error(
        `Failed to parse ${CONFIG_FILENAME} at ${configPath}: ${(err as Error).message}`,
      );
    }
  }

  const merged: LintkbConfig = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const kbDirAbsolute = isAbsolute(merged.kbDir)
    ? merged.kbDir
    : resolve(projectRoot, merged.kbDir);

  return {
    ...merged,
    projectRoot,
    kbDirAbsolute,
  };
}
