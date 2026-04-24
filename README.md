# lintkb

[![npm version](https://img.shields.io/npm/v/lintkb.svg)](https://www.npmjs.com/package/lintkb)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/armadacore/lintkb/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/lintkb.svg)](https://nodejs.org)

> AI-agnostic ESLint wrapper that turns lint findings into **concrete instructions for any AI agent**, backed by a project-local Markdown knowledge base.

`lintkb` does not invent its own ESLint rules. It runs your existing ESLint setup and **enriches every finding with a clear instruction telling an AI agent which Markdown file to read in order to fix the problem the way your team wants it fixed**.

If the Markdown file does not exist yet, the instruction tells the AI to **collaborate with the user to create it** — the knowledge base grows organically as you encounter findings.

---

## Why lintkb?

ESLint tells you _what_ is wrong. It cannot tell an AI _how this team wants it solved_. Generic AI fixes drift away from project conventions, and pasting your style guide into every prompt does not scale.

`lintkb` closes that gap by attaching a deterministic pointer to each finding:

> _"This violation maps to `.rules/<rule>.md`. Read it. Apply the fix. If the file is missing, ask the user and create it."_

The result is a self-growing, version-controlled, human-reviewable knowledge base that any AI agent — Claude Code, Cursor, OpenCode, Copilot CLI, or your own — can consume without integration work.

---

## Quick start (60 seconds)

```bash
# 1. install
npm install --save-dev lintkb

# 2. initialize the knowledge base
npx lintkb init

# 3. lint and read AI-ready output
npx lintkb
```

That's it. Pipe the output to your AI agent of choice and it will know which Markdown file to read for each finding.

---

## Installation

```bash
npm install --save-dev lintkb
```

**Requirements**

- Node.js `>=18.17.0`
- ESLint `^9` already installed in the target project (flat config). ESLint is a **peer dependency** — bring your own.

---

## How it works

```
1. dev/agent runs:  npx lintkb
2. lintkb runs ESLint programmatically
3. For every finding:
     - the rule id (e.g. "@typescript-eslint/no-explicit-any") is normalized
       into a deterministic file name (typescript-eslint__no-explicit-any.md)
     - lintkb checks if <kbDir>/<file>.md exists in the target project
     - the standard ESLint output line is augmented with an
       "AI INSTRUCTION" block, in English, telling the AI what to do
4. Any AI agent (Claude Code, Cursor, OpenCode, Copilot CLI, ...) reads the
   output, opens the Markdown file, and applies the documented fix.
   If the file is missing, the AI works with the user to create it.
```

The knowledge base lives **inside the target project** (default `.rules/`) and is committed to that project's repo. Each entry is plain Markdown so it can be reviewed, edited, and version-controlled like any other documentation.

### Workflow with an AI agent

```
┌──────────┐   npx lintkb   ┌────────────┐
│ user/AI  │───────────────▶│  lintkb    │
└──────────┘                └─────┬──────┘
                                  │ findings + AI INSTRUCTION
                                  ▼
                             ┌──────────┐
                             │  any AI  │
                             └────┬─────┘
                                  │
              ┌───────────────────┴───────────────────┐
              ▼                                       ▼
      ┌────────────────┐                   ┌──────────────────┐
      │ KB entry found │                   │ KB entry missing │
      │ → read .md     │                   │ → ask user       │
      │ → apply fix    │                   │ → write .md      │
      └────────────────┘                   │ → apply fix      │
                                           └──────────────────┘
```

---

## Output format

### Case A — knowledge base entry exists

```
src/foo.ts
  12:5  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

  → AI INSTRUCTION (src/foo.ts:12:5):
    Read .rules/typescript-eslint__no-explicit-any.md and apply the
    described fix to this finding.
```

### Case B — knowledge base entry missing

```
src/bar.ts
  18:3  error  Promises must be handled  @typescript-eslint/no-floating-promises

  → AI INSTRUCTION (src/bar.ts:18:3):
    No knowledge base entry exists for rule
    "@typescript-eslint/no-floating-promises".
    Ask the user how this rule should be handled in this project,
    then create .rules/typescript-eslint__no-floating-promises.md
    with the agreed solution and apply the fix to this finding.
    On the next lint run this entry will be reused.
```

### Case C — self-explanatory rule

```
src/baz.ts
  4:1  error  Unexpected debugger statement  no-debugger

  → AI INSTRUCTION (src/baz.ts:4:1):
    Rule "no-debugger" is configured as self-explanatory.
    No knowledge base entry is required. Apply the fix directly based
    on the ESLint message above.
```

A machine-readable JSON output is also available via `--format json`.

---

## CLI

`lint` is the **default action**, so you can pass the path directly.

| Command                       | Purpose                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `lintkb init`                 | Create `.lintkbrc.json` and the directory referenced by `kbDir` in the current project.           |
| `lintkb [path]`               | Default action. Run ESLint on `path` (default `.`) and print findings with AI INSTRUCTION blocks. |
| `lintkb [path] --format json` | Same, but as JSON. Each finding includes `kbPath`, `kbExists`, `kbRequired`, `aiInstruction`.     |
| `lintkb lint [path]`          | Same as `lintkb [path]` — kept for explicitness.                                                  |
| `lintkb --version`            | Print the installed lintkb version.                                                               |
| `lintkb --help`               | Show all commands and options.                                                                    |

### `init` options

| Option           | Description                                       |
| ---------------- | ------------------------------------------------- |
| `--kb-dir <dir>` | Override the default `kbDir` (default: `.rules`). |
| `--force`        | Overwrite an existing `.lintkbrc.json`.           |

### `lint` options

| Option                  | Description                      |
| ----------------------- | -------------------------------- |
| `--format <text\|json>` | Output format (default: `text`). |

### Examples

```bash
lintkb                       # lint the whole project
lintkb packages/core/src     # lint a specific path
lintkb . --format json       # JSON output for AI consumers
```

### Exit codes

| Code | Meaning                                                          |
| ---- | ---------------------------------------------------------------- |
| `0`  | No error-severity findings.                                      |
| `1`  | At least one error-severity finding was reported.                |
| `2`  | Unexpected failure (config error, ESLint crash, I/O error, ...). |

---

## Configuration

Each target project has a `.lintkbrc.json` at its root:

```json
{
  "kbDir": ".rules",
  "eslintConfig": "./eslint.config.js",
  "selfExplanatory": [
    "no-debugger",
    "@typescript-eslint/no-unused-vars"
  ],
  "instructions": {
    "kbExists": "→ AI INSTRUCTION ({file}:{line}:{column}):\n  Read {kbPath} and apply the described fix to this finding."
  }
}
```

| Field             | Meaning                                                                                                                                | Default                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `kbDir`           | Directory (relative to project root) that holds the Markdown knowledge base.                                                           | `.rules`                |
| `eslintConfig`    | Optional path to an ESLint flat config. If absent, ESLint auto-discovers it.                                                           | (ESLint auto-discovery) |
| `selfExplanatory` | List of ESLint rule ids whose findings need **no** Markdown entry. The AI is told to fix them directly based on the ESLint message.    | `[]`                    |
| `instructions`    | Override the AI instruction text per case. See [Customizing AI instructions](#customizing-ai-instructions).                            | (built-in defaults)     |

### When to use `selfExplanatory`

Some ESLint findings are already crystal clear from their message alone (e.g. `no-debugger`, `no-unused-vars`, `prefer-const`). Maintaining a `.md` for them is overhead. List them in `selfExplanatory` and `lintkb` will:

- skip the KB lookup entirely,
- emit an AI INSTRUCTION saying *"this rule is self-explanatory, fix directly from the ESLint message"*,
- set `kbRequired: false` and `kbPath: null` in the JSON output.

### Customizing AI instructions

The wording of the AI INSTRUCTION block is fully configurable per case via `instructions` in `.lintkbrc.json`. Use this to:

- speak to your AI agent in a different tone or language,
- enforce project-specific conventions (e.g. *"never run lintkb in CI without `--format json`"*),
- swap in stronger directives (e.g. *"do not modify imports until the user confirms"*).

Each case has its own template. Any field you omit falls back to the built-in English default.

| Field                         | When it is used                                              |
| ----------------------------- | ------------------------------------------------------------ |
| `instructions.kbExists`       | The Markdown file for the rule **exists** in `kbDir`.        |
| `instructions.kbMissing`      | The Markdown file for the rule **does not exist** in `kbDir`. |
| `instructions.selfExplanatory`| The rule is listed in `selfExplanatory`.                     |

> Findings without a rule id (parser/fatal errors) always use a hardcoded fallback and cannot be customized.

#### Available variables

Templates may reference these placeholders in `{name}` syntax:

| Variable    | Value                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| `{ruleId}`  | The ESLint rule id (e.g. `@typescript-eslint/no-explicit-any`).             |
| `{kbPath}`  | Project-relative path to the KB entry (empty for self-explanatory rules).   |
| `{file}`    | Project-relative path of the file containing the finding.                   |
| `{line}`    | 1-based line number of the finding.                                         |
| `{column}`  | 1-based column of the finding.                                              |

Unknown placeholders are left untouched in the output, so a typo like `{rulId}` is immediately visible.

#### Example: minimal, German wording, no header

```json
{
  "instructions": {
    "kbExists": "Lies {kbPath} und wende die dort beschriebene Lösung auf {file}:{line} an.",
    "kbMissing": "Für Regel \"{ruleId}\" gibt es noch keine Anleitung. Erstelle {kbPath} gemeinsam mit dem User und wende die Lösung dann an.",
    "selfExplanatory": "Regel \"{ruleId}\" ist selbsterklärend – behebe direkt anhand der ESLint-Meldung."
  }
}
```

#### Example: override only one case

```json
{
  "instructions": {
    "kbMissing": "STOP. Ask the user before creating {kbPath} for rule \"{ruleId}\"."
  }
}
```

`kbExists` and `selfExplanatory` keep their built-in defaults.

---

## Rule ID → file name (deterministic)

| ESLint rule id                       | Markdown file name                      |
| ------------------------------------ | --------------------------------------- |
| `no-console`                         | `no-console.md`                         |
| `eqeqeq`                             | `eqeqeq.md`                             |
| `@typescript-eslint/no-explicit-any` | `typescript-eslint__no-explicit-any.md` |
| `@typescript-eslint/no-unused-vars`  | `typescript-eslint__no-unused-vars.md`  |
| `react-hooks/exhaustive-deps`        | `react-hooks__exhaustive-deps.md`       |
| `react/jsx-key`                      | `react__jsx-key.md`                     |

Normalization rules:

- `/` becomes `__`
- A leading `@scope/plugin` becomes `scope__plugin` (the leading `@` is dropped)

This mapping is pure, deterministic, and covered by unit tests — so a rule id always resolves to the same file on every machine.

---

## Programmatic API

`lintkb` can be used as a library in addition to the CLI. All public symbols are exported from the package root.

```ts
import {
  loadConfig,
  runEslint,
  enrichFindings,
  formatText,
  formatJson,
} from "lintkb";

// 1. resolve config (walks upward from cwd to find .lintkbrc.json)
const config = loadConfig(process.cwd());

// 2. run ESLint and get raw findings
const findings = await runEslint(".", config);

// 3. enrich findings with KB metadata + AI INSTRUCTION blocks
const result = enrichFindings(findings, config);

// 4. render however you like
console.log(formatText(result));
// or:
console.log(formatJson(result));

// or consume the structured data directly
for (const f of result.findings) {
  console.log(f.relativeFilePath, f.ruleId, f.kbExists, f.aiInstruction);
}
```

### Exported types

- `LintkbConfig`, `ResolvedConfig`, `InstructionTemplates`
- `Finding`, `EnrichedFinding`, `FindingSeverity`, `LintRunResult`

### Exported functions

- `loadConfig(cwd)` — locate and parse `.lintkbrc.json`, merge with defaults.
- `runEslint(path, config)` — run ESLint programmatically, return normalized `Finding[]`.
- `enrichFindings(findings, config)` — attach KB metadata and AI INSTRUCTION blocks.
- `formatText(result)` / `formatJson(result)` — render the result.
- `ruleIdToFileName(id)` / `ruleIdToKbRelativePath(id, kbDir)` — the deterministic rule-id mapping.
- `kbEntryExists(path, projectRoot)` — filesystem check for a KB entry.
- `buildAiInstruction(finding, kbPath, kbExists, kbRequired, instructions?)` — build a single instruction block.
- `renderTemplate(template, vars)` — substitute `{name}` placeholders.
- `DEFAULT_INSTRUCTION_TEMPLATES` — the built-in English templates used when `instructions` is omitted.

---

## FAQ

**Why an ESLint wrapper instead of a standalone tool?**
ESLint already knows your project's rule set, plugin ecosystem, and file matching. Re-implementing that would mean fighting an ecosystem you already use. `lintkb` adds one layer on top: it links findings to documentation an AI can act on.

**Why Markdown instead of a structured format?**
Markdown is reviewable in pull requests, renders in every IDE, has zero schema overhead, and any AI agent can read it natively. The knowledge base is documentation first, machine input second.

**Why no built-in AI API integration?**
The whole point is AI-agnosticism. `lintkb` produces text and JSON; whatever agent you use today (or switch to next year) can consume it without lintkb knowing about it. Zero vendor lock-in.

**What if a rule has no useful project-specific guidance?**
Add it to `selfExplanatory` in `.lintkbrc.json`. The AI will be told to fix it directly from the ESLint message — no `.md` required.

**Does lintkb modify my code?**
No. `lintkb` is read-only. It produces output. The AI agent — under user supervision — applies fixes.

**Does lintkb work in CI?**
Yes. Exit code `1` on any error-severity finding makes it CI-friendly. Use `--format json` for machine consumption.

**Does it support legacy `.eslintrc` configs?**
No. ESLint 9 flat config only.

---

## Contributing

Contributions are welcome. Please:

- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:` ...).
- Run `npm run typecheck`, `npm test`, and `npm run build` before opening a PR.
- Add or update unit tests for any change in `src/core/`.
- Keep the AI instructions in `output-formatter.ts` in **English** so the package stays agent-agnostic.

Repository: <https://github.com/armadacore/lintkb>

---

## License

[MIT](./LICENSE)
