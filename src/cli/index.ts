import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runLint } from "./commands/lint.js";

const program = new Command();

program
  .name("lintkb")
  .description(
    "AI-agnostic ESLint wrapper that enriches findings with concrete AI " +
      "instructions pointing to a project-local Markdown knowledge base.",
  )
  .version("0.1.0");

/**
 * Default action: lint.
 *
 * Allows usage like:
 *   lintkb                     -> lints "."
 *   lintkb packages/core/src -> lints that path
 *   lintkb --format json .     -> JSON output
 *
 * The explicit `lint` subcommand below is kept for backwards compatibility.
 */
program
  .argument("[path]", "Path to lint (default: .)", ".")
  .option("--format <format>", "Output format: text | json", "text")
  .action(async (path: string, opts) => {
    // If the user typed a known subcommand as the first arg, commander would
    // normally route there — but only if the subcommand was registered before
    // the default action. We register subcommands below, so commander
    // dispatches them correctly. Here we only handle the default lint case.
    await executeLint(path, opts.format);
  });

program
  .command("init")
  .description("Create .lintkbrc.json and the kbDir directory in the current project.")
  .option("--kb-dir <dir>", "Override default kbDir (default: .rules)")
  .option("--force", "Overwrite an existing .lintkbrc.json")
  .action((opts) => {
    runInit({ kbDir: opts.kbDir, force: !!opts.force });
  });

program
  .command("lint")
  .description("Run ESLint and print findings with AI INSTRUCTION blocks. (Default action — `lintkb <path>` works too.)")
  .argument("[path]", "Path to lint (default: .)", ".")
  .option("--format <format>", "Output format: text | json", "text")
  .action(async (path: string, opts) => {
    await executeLint(path, opts.format);
  });

async function executeLint(path: string, formatOpt: string): Promise<void> {
  const format = formatOpt === "json" ? "json" : "text";
  try {
    const exitCode = await runLint(path, { format });
    process.exit(exitCode);
  } catch (err) {
    process.stderr.write(`lintkb: ${(err as Error).message}\n`);
    process.exit(2);
  }
}

program.parseAsync(process.argv);
