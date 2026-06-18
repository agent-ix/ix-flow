# `skill-with-invariant/03-hitl-gate`

A human-in-the-loop gate: the terminal advance returns `gate_deferred` with an
open gate token. The phase stays `staged` until `ix-flow ack` consumes the
token and the advance is retried.

## What this example demos

- `defaultGate: hitl` as enforced workflow policy
- `advance` returning `state="gate_deferred"` instead of an invariant failure
- `open_gates` and `next_actions` telling the agent exactly what to do next
- `ack` consuming a CLI-issued token, not creating a magic artifact

## Walkthrough

```sh
ix-flow run --path examples/skill-with-invariant/03-hitl-gate --json
# -> current_phase="staged"

ix-flow advance <wf-id> published --json
# -> ok=false
# -> state="gate_deferred"
# -> open_gates[0].token="ack_..."
# -> next_actions includes `ix-flow ack <wf-id> <token> --reviewer <user>`

ix-flow ack <wf-id> <token> --reviewer jane --note "approved" --json
# -> ok=true
# -> next_actions points back at the advance

ix-flow advance <wf-id> published --json
# -> ok=true
# -> current_phase="published"
```

## Why this shape

Human approval is policy, not a correctness invariant. Invariants decide
whether the transition is well-formed; the gate evaluator decides whether it
needs human acknowledgement before the phase can move.
