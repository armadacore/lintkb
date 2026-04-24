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
  .description("Run ESLint and print findings with AI INSTRUCTION blocks.")
  .argument("[path]", "Path to lint (default: .)", ".")
  .option("--format <format>", "Output format: text | json", "text")
  .action(async (path: string, opts) => {
    const format = opts.format === "json" ? "json" : "text";
    try {
      const exitCode = await runLint(path, { format });
      process.exit(exitCode);
    } catch (err) {
      process.stderr.write(`lintkb: ${(err as Error).message}\n`);
      process.exit(2);
    }
  });

program.parseAsync(process.argv);
