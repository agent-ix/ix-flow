# Community install smoke test

A clean-room, repeatable check that a brand-new developer can install `ix-flow`
from **public npm** and use it **inside Claude Code** with no Agent-IX internal
config and no Anthropic API key.

```bash
make install-smoke                       # from the repo root (real community path)
PLUGIN_SOURCE=local ./smoke/run.sh       # validate the working tree (what CI runs)
PKG_VERSION=0.0.4 ./smoke/run.sh         # pin for byte-for-byte reproducibility
```

## Plugin source

- `PLUGIN_SOURCE=github` (default) installs the plugin from `agent-ix/ix-flow` on
  GitHub's default branch — the exact path a community user follows.
- `PLUGIN_SOURCE=local` installs the plugin from the mounted checkout — validates
  the manifest in *this* revision before it reaches the default branch. CI uses
  this (see `.github/workflows/install-smoke.yml`) so a PR's own changes are
  tested.

## What it does

A fresh `node:24` container with **no `.npmrc` and no `@agent-ix` scope
override** (exactly an outside user's machine):

1. **Stage 1 — public npm.** `npm install -g @agent-ix/ix-flow` from
   `registry.npmjs.org` and runs the `ix-flow` bin. Proves the published CLI and
   its full dependency tree resolve from public npm with zero auth.
2. **Stage 2 — Claude plugin.** `claude plugin marketplace add` + `plugin
   install` (the CLI form of the README's `/plugin` steps) clone and install the
   plugin.
3. **Assert.** For every skill/workflow in [`expected.txt`](./expected.txt):
   the file is present in the plugin cache **and** — the part that matters to a
   user — the skill is exposed as a usable `/command`. That comes from Claude's
   `system/init` event (loaded `plugins[]`, `plugin_errors`, and skills as
   `slash_commands`), which Claude emits **before authentication**, so the whole
   test is deterministic and needs **no credentials**. A skill present on disk
   but missing from the command list is a FAIL — the "installed but I don't see
   it in Claude" failure mode.

## Auth

None required. The plugin install is plain git and the slash-command check reads
the pre-auth init event, so everything runs without an Anthropic API key or a
subscription token — which is what makes it CI-friendly.

(`run.sh` will bind-mount `~/.claude/.credentials.json` read-only if present, so
the `claude -p` probe can also complete a real turn on your subscription; the
token is never read or extracted. It is optional and changes no assertions.)

This complements the `agent-pty` evals (`make evals`), which measure a real
agent's token/tool/latency behavior; this harness only verifies installability.
