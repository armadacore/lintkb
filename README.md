# lintkb

> AI-agnostic ESLint wrapper that turns lint findings into **concrete instructions for any AI agent**, backed by a project-local Markdown knowledge base.

`lintkb` does not invent its own ESLint rules. It runs your existing ESLint setup (TypeScript, React, whatever you configured) and **enriches every finding with a clear instruction telling an AI agent which Markdown file to read in order to understand and fix the problem in the way your project wants it fixed**.

If the Markdown file does not exist yet, the instruction tells the AI to **collaborate with the user to create it**, so the knowledge base grows organically as you encounter findings.

---

## Mission in one sentence

Bridge the gap between *"ESLint says rule X is violated"* and *"the AI knows exactly how this team wants it solved"* — without binding the project to any specific AI vendor.

---

## Installation

`lintkb` is published as a single npm package. ESLint 9+ is a **peer dependency** — bring your own.

### From a local tarball (current PoC distribution)

```bash
# in the lintkb repo
npm pack
# → produces lintkb-<version>.tgz

# in your target project
npm install --save-dev /absolute/path/to/lintkb-<version>.tgz
```

### From npm (once published)

```bash
npm install --save-dev lintkb
```

### Requirements

- Node.js `>=18.17.0`
- ESLint `^9` already installed in the target project (flat config)

### First run in your project

```bash
npx lintkb init    # creates .lintkbrc.json + .rules/
npx lintkb         # lints the whole project
```

---

## How it works

```
1. dev/agent runs:  npx lintkb lint
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

A machine-readable JSON output is also available via `--format json`.

---

## Configuration

Each target project has a `.lintkbrc.json` at its root:

```json
{
  "kbDir": ".rules",
  "eslintConfig": "./eslint.config.js"
}
```

| Field          | Meaning                                                                          | Default                  |
| -------------- | -------------------------------------------------------------------------------- | ------------------------ |
| `kbDir`        | Directory (relative to project root) that holds the Markdown knowledge base.     | `.rules`                 |
| `eslintConfig` | Optional path to an ESLint flat config. If absent, ESLint auto-discovers it.     | (ESLint auto-discovery)  |

---

## Rule ID → file name (deterministic)

| ESLint rule id                          | Markdown file name                            |
| --------------------------------------- | --------------------------------------------- |
| `no-console`                            | `no-console.md`                               |
| `eqeqeq`                                | `eqeqeq.md`                                   |
| `@typescript-eslint/no-explicit-any`    | `typescript-eslint__no-explicit-any.md`       |
| `@typescript-eslint/no-unused-vars`     | `typescript-eslint__no-unused-vars.md`        |
| `react-hooks/exhaustive-deps`           | `react-hooks__exhaustive-deps.md`             |
| `react/jsx-key`                         | `react__jsx-key.md`                           |

Normalization rules:

- `/` becomes `__`
- A leading `@scope/plugin` becomes `scope__plugin` (the leading `@` is dropped)

---

## CLI

`lint` is the **default action**, so the path can be passed directly.

| Command                              | Purpose                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `lintkb init`                        | Creates `.lintkbrc.json` and the directory referenced by `kbDir`.                                            |
| `lintkb [path]`                      | Default action. Runs ESLint on `path` (default `.`) and prints output augmented with AI INSTRUCTION blocks.  |
| `lintkb [path] --format json`        | Same, but as JSON. Each finding includes `kbPath`, `kbExists`, `aiInstruction`.                              |
| `lintkb lint [path]`                 | Same as `lintkb [path]` — kept for explicitness / backwards compatibility.                                   |

### Examples

```bash
lintkb                       # lint the whole project
lintkb packages/core/src   # lint a specific path
lintkb . --format json       # JSON output for AI consumers
```

---

## Tech stack

- TypeScript 5
- ESLint 9 (flat config, used programmatically)
- `commander` for the CLI
- `vitest` for tests
- `tsup` for the bundle
- AI instruction language: **English** (so it works with any agent)

---

## Acceptance criteria (PoC)

- [ ] `lintkb init` creates `.lintkbrc.json` and the directory referenced by `kbDir`.
- [ ] `lintkb lint` shows, for **every** finding, an AI INSTRUCTION block including file path and line number.
- [ ] Case A (KB present) and Case B (KB missing) are clearly distinguishable in the output.
- [ ] Rule-id normalization is deterministic and covered by unit tests.
- [ ] `--format json` output contains `kbPath`, `kbExists`, and `aiInstruction` for each finding.
- [ ] Unit tests exist for `rule-resolver`, `rule-reader`, `output-formatter`, `config`.
- [ ] At least one successful manual end-to-end test with a real AI agent.

---

## Out of scope (PoC)

- Monorepo layout
- MCP server
- Built-in AI API integration
- Editor / LSP integration
- Auto-fix
- Legacy (non-flat) ESLint config support
- Versioning / migration of KB entries
- Inventing new ESLint rules

---

## Status

Proof of concept. Single npm package, ESLint 9 flat config, English AI instructions. Designed to stay small and KI-agnostic.
