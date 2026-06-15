export class WorkflowCoreError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InstanceNotFoundError extends WorkflowCoreError {
  constructor(id: string) {
    super("instance_not_found", `Workflow instance '${id}' was not found.`, {
      id,
    });
  }
}

export class StateVersionConflictError extends WorkflowCoreError {
  constructor(id: string, expectedVersion: number, actualVersion: number) {
    super(
      "state_version_mismatch",
      `Workflow instance '${id}' has version ${actualVersion}, expected ${expectedVersion}.`,
      { id, expectedVersion, actualVersion },
    );
  }
}

export class TransitionNotFoundError extends WorkflowCoreError {
  constructor(id: string, from: string, to: string) {
    super(
      "transition_not_found",
      `Workflow instance '${id}' cannot transition from '${from}' to '${to}'.`,
      { id, from, to },
    );
  }
}

export class TransitionInvariantError extends WorkflowCoreError {
  constructor(
    id: string,
    from: string,
    to: string,
    invariant: string,
    reason = "Invariant failed.",
    invariantCode = "invariant_failed",
    invariantDetails: Record<string, unknown> = {},
  ) {
    super(
      "transition_invariant_failed",
      `Workflow instance '${id}' cannot transition from '${from}' to '${to}': ${reason}`,
      { id, from, to, invariant, invariantCode, invariantDetails },
    );
  }
}

export class TransitionInvariantUnregisteredError extends WorkflowCoreError {
  constructor(id: string, from: string, to: string, invariant: string) {
    super(
      "transition_invariant_unregistered",
      `Workflow instance '${id}' cannot transition from '${from}' to '${to}': invariant '${invariant}' is not registered.`,
      { id, from, to, invariant },
    );
  }
}

export class GateTokenInvalidError extends WorkflowCoreError {
  constructor(id: string, token: string) {
    super(
      "gate_token_invalid",
      `Workflow instance '${id}' has no open gate for token '${token}'.`,
      { id, token },
    );
  }
}
