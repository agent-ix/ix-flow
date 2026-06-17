---
name: ix-flow
description: Run an Agent IX workflow with ix-flow — create a run and drive it through its phases, pausing at human gates for approval. Use when asked to run, start, continue, or resume an ix-flow workflow.
---

# Run a workflow

Drive an `ix-flow` workflow to completion. The user names a workflow (and may point at a
skill directory); you create a run and advance it through its phases, stopping at human
gates for their approval.

Pass `--json` to every command and read the result envelope — `state`, `current_phase`,
`open_gates[].token`, and `next_actions` tell you what to do next.

## Steps

1. **Resolve the workflow.** Use a registered definition name directly, or a skill
   directory with `--path <skill-dir>`. If a run is already in progress, skip to step 3
   with its run id.

2. **Create the run.**

   ```bash
   ix-flow run <workflow> [--path <skill-dir>] --json
   ```

   Record `instance_id` (the run id) and `current_phase`.

3. **Advance through the phases.** Read the workflow's own `SKILL.md` for how to proceed,
   then move along its declared transitions:

   ```bash
   ix-flow status <run-id> --json
   ix-flow advance <run-id> <next-phase> --json
   ```

   If `state` is `invariant_failed`, the run stayed put — satisfy what the failure reports,
   then advance again.

4. **Handle human gates.** When `advance` returns `state: gate_deferred`, the workflow is
   waiting on human approval. Present what is being approved to the user and wait for their
   decision. Once they approve, record it and continue:

   ```bash
   ix-flow ack <run-id> <token> --reviewer <user>
   ix-flow advance <run-id> <next-phase> --json
   ```

   The `<token>` is `open_gates[0].token` from the deferred result.

5. **Finish.** Stop when the run reaches a terminal phase. Report the final phase and a
   short summary of what happened.

## Notes

- Never acknowledge a gate on the user's behalf — a gate exists to get their decision.
- Runs persist under `~/.ix/flows`; use `ix-flow resume <run-id>` to pick one back up in a
  new session.
