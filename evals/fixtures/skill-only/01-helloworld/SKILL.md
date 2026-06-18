---
name: helloworld-example
description: Smallest possible workflow skill — two phases joined by one auto transition.
contributes:
  workflows: ./workflows
---

# Hello, world (skill-only)

The minimum viable workflow skill. Two phases (`start`, `done`), one
auto-gated transition, no items, no links, no invariants. Useful as a
copy-paste starting point.

When an agent runs this skill, the entire job is:

1. `ix-flow run --path <this-dir> --json`
2. `ix-flow advance <id> done --json`
3. Stop.

Always pass `--json` to every `ix-flow` command. The phase argument
to `advance` is positional, not `--to`.
