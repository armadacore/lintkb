---
ruleId: no-console
severity: error
tags: [logging]
---

# no-console

## Problem

`console.log` (and friends) leaks debug noise into production output and
bypasses our structured logger.

## Solution (for the AI agent)

1. Replace `console.log` / `console.warn` / `console.error` with a call
   to the project's logger (e.g. `logger.info`, `logger.warn`,
   `logger.error`). If no logger exists yet, ask the user which one to
   introduce.
2. If the log statement was only used for ad-hoc debugging, remove it.
3. Never silence the rule with `// eslint-disable`.
