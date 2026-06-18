---
name: acyclic-links-example
description: Build a directed graph of nodes; the core `acyclic` invariant gates the terminal advance.
contributes:
  workflows: ./workflows
---

# Acyclic links (skill-only)

Records `node` items and `link` records between them, then advances to a
terminal phase only when the link graph is acyclic. The `acyclic`
invariant is one of two predicates shipped in
`@agent-ix/workflow-core/invariants` and is the only core invariant a
user can drive to fail through CLI commands alone.
