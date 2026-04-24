import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CONFIG_FILENAME, DEFAULT_CONFIG } from "../../core/config.js";

export interface InitOptions {
  cwd?: string;
  /** Override default kbDir. */
  kbDir?: string;
  /** Overwrite an existing config file. */
  force?: boolean;
}

/**
 * Create `.lintkbrc.json` and the kbDir directory in the current project.
 */
export function runInit(options: InitOptions = {}): void {
  const cwd = resolve(options.cwd ?? process.cwd());
  const configPath = join(cwd, CONFIG_FILENAME);

  const kbDir = options.kbDir ?? DEFAULT_CONFIG.kbDir;
  const config = {
    kbDir,
  };

  if (existsSync(configPath) && !options.force) {
    process.stdout.write(
      `lintkb: ${CONFIG_FILENAME} already exists at ${configPath}. ` +
        `Use --force to overwrite.\n`,
    );
  } else {
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
    process.stdout.write(`lintkb: wrote ${configPath}\n`);
  }

  const kbDirAbsolute = resolve(cwd, kbDir);
  if (!existsSync(kbDirAbsolute)) {
    mkdirSync(kbDirAbsolute, { recursive: true });
    process.stdout.write(`lintkb: created ${kbDirAbsolute}\n`);
  } else {
    process.stdout.write(`lintkb: ${kbDirAbsolute} already exists\n`);
  }
}
