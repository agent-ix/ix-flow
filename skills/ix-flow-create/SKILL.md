---
name: ix-flow-create
description: Author a new Agent IX workflow — scaffold a flow (def.yaml) and the skill (SKILL.md) that runs it. Use when asked to create, author, or scaffold an ix-flow workflow.
---

# Author a workflow

Create a new `ix-flow` workflow: a **flow** that declares the states and moves, and a
**skill** that tells the agent how to run it. They live together in a skill directory:

```
<name>/
  SKILL.md
  workflows/
    <name>/
      def.yaml
```

## Steps

1. **Gather the shape.** Settle on the workflow `<name>` and its phases in order, which
   transitions connect them, which transitions need human approval (a `hitl` gate), and any
   invariants that must hold before a move. Ask the user where there is genuine ambiguity;
   otherwise propose a sensible flow.

2. **Write the flow** at `<name>/workflows/<name>/def.yaml`:

   ```yaml
   name: <name>
   version: 0.1.0
   description: <one line>
   initialPhase: <first-phase>
   phases:
     - { name: <first-phase> }
     - { name: <last-phase>, terminal: true }
   transitions:
     - { from: <first-phase>, to: <last-phase>, defaultGate: auto } # or hitl
   ```

   See `docs/guide.md` for the full field reference (gate modes, built-in invariants, custom
   `scripts/invariants.js`).

3. **Write the skill** at `<name>/SKILL.md`. Frontmatter must declare the workflows dir; the
   body tells the agent how to run the flow:

   ```markdown
   ---
   name: <name>
   description: <what this workflow does>
   contributes:
     workflows: ./workflows
   ---

   # /<name>

   Start from the run status and follow the reported next actions. Advance the run through
   its phases, and stop at human gates until they are approved.
   ```

4. **Smoke-test it.** Confirm the definition loads and a run starts:

   ```bash
   ix-flow run <name> --path <name>
   ```

   Fix any `definition_schema_invalid` / `skill_format_invalid` errors it reports.

5. **Report** the created files and how to run it (`/ix-flow <name> --path <dir>`).

## Reference

`examples/release` is a complete, runnable template — copy its structure when in doubt.
