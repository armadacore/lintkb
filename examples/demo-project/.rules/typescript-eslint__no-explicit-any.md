---
ruleId: "@typescript-eslint/no-explicit-any"
severity: error
tags: [typescript, type-safety]
---

# @typescript-eslint/no-explicit-any

## Problem

The TypeScript `any` type disables all type checking for the value it
annotates. This defeats the purpose of TypeScript and hides bugs.

## Why it matters in this project

We rely on type-safety to catch refactoring mistakes early. Every `any`
introduces a blind spot in the type graph that other contributors will
later have to debug at runtime.

## Solution (for the AI agent)

1. Look at how the value is **used** downstream (read its properties,
   call signatures, narrowings).
2. Replace `any` with the most precise type you can infer:
   - If the shape is known, declare an `interface` or `type`.
   - If the value is opaque, use `unknown` and narrow with type guards.
   - If it really is dynamic JSON, use `unknown` plus a parsing step
     (e.g. zod schema).
3. Never use `any` as a quick fix. If you cannot determine the type,
   ask the user for guidance.

## Examples

### Wrong

```ts
function processItem(item: any): void {
  console.log(item.id);
}
```

### Right

```ts
interface Item {
  id: string;
}

function processItem(item: Item): void {
  console.log(item.id);
}
```

Or, if the input is genuinely opaque:

```ts
function processItem(item: unknown): void {
  if (typeof item === "object" && item !== null && "id" in item) {
    console.log((item as { id: string }).id);
  }
}
```
