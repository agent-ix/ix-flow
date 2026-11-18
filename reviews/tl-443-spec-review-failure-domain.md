---
id: SR-008
title: "Failure-domain review — TL-443 immutable provider provenance"
type: SpecReview
analysis: failure-domain
scope: "TL-443; spec/functional/FR-022-external-invariant-providers.md"
review_set: subset
relationships:
  - target: "ix://agent-ix/ix-flow/FR-022"
    type: reviews
---

## Summary

Reviewed FR-022's provider trust boundary, identity key, and retained-history behavior. The engine-owned run identity is explicit, but a provider can still derive its history directory from mutable `quoin_context.config_root`, allowing a proposer to reset history by redirecting the store.

## Verdict

**FAIL** — the retained-history storage root remains in the failure domain and is not covered by the immutable projection.

## Scope

- **Examined — FR-022:** “ix-flow SHALL include these values outside `instance.items`, so item patches cannot set or override run identity or transition provenance.”
- **Examined — FR-022:** “A provider that retains evaluator history SHALL key that history by `run.instance_id`. The provider SHALL count only evaluator results it recorded for that same run; proposer-mutable `instance.items` SHALL NOT be treated as run identity or prior evaluator results.”
- **Examined — FR-022-AC-9:** “Each external provider request contains engine-derived run fields outside `instance.items`; patching ordinary items with forged run fields or evaluator history cannot override the run projection.”

## Findings

| ID      | Severity | Summary                                                                                                         | Refs         |
| ------- | -------- | --------------------------------------------------------------------------------------------------------------- | ------------ |
| FND-001 | high     | Mutable `quoin_context.config_root` can redirect the provider history file and reset the evaluator denial count | FR-022:60-67 |

### FND-001 after_excerpt

```text
When provider history uses a workflow item to select its storage location, the workflow SHALL declare that item type in
`systemOwnedItemTypes` and SHALL seed the item before proposer control begins.
When a seeded system-owned item type contains an item, ix-flow SHALL reject
`update-item` and every later `add-item` to that type with
`item_system_owned`, as specified by FR-019.
```

## Findings Detail

### FND-001 — Mutable context redirects retained history

The engine-owned `run.instance_id` prevents changing the run key itself, but Quoin's persisted evaluator history is stored below the `config_root` supplied through the ordinary `quoin_context` item. Patching that item to another root changes the history file path and makes prior denials disappear. The requirement must make the provider's state-store location host-owned or protect the item supplying it; AC-9 should cover this reset attempt.

## Dispositions

| FND     | Outcome | Reason                                                                                                                    |
| ------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| FND-001 | fixed   | FR-022 now makes the history-location item system-owned after bootstrap seeding and rejects updates and replacement adds. |

### Round 1 evidence

The fixed contract states:

> When provider history uses a workflow item to select its storage location, the workflow SHALL declare that item type in `systemOwnedItemTypes` and SHALL seed the item before proposer control begins. When a seeded system-owned item type contains an item, ix-flow SHALL reject `update-item` and every later `add-item` to that type with `item_system_owned`, as specified by FR-019.
