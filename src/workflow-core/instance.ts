import type { GateMode } from "./definition.js";
import type { JsonValue } from "./canonical.js";
import type { WorkflowEvent } from "./event.js";

export interface TargetRef {
  kind: string;
  ref: string;
}

export interface WorkflowInstance {
  id: string;
  defName: string;
  defVersion: string;
  defHash: string;
  writerVersion: string;
  name: string;
  targets: TargetRef[];
  phase: string;
  gateConfig: Record<string, GateMode>;
  openGates?: WorkflowGate[];
  satisfiedGates?: WorkflowGateAck[];
  items: Record<string, JsonValue[]>;
  links: JsonValue[];
  artifacts: JsonValue[];
  openQuestions: JsonValue[];
  events: WorkflowEvent[];
  stateVersion: number;
  /**
   * Recorded skill location for path-mode instances (FR-011-AC-3,
   * FR-011-AC-6). Always carries `absolute` (the path resolved at create
   * time); `relative` is populated when the skill lives under the
   * parent of the state directory (project root by convention). On
   * reload the runner prefers `relative` resolved against the *current*
   * state-dir parent — this lets path-mode instances survive
   * `mv project/` and survive committing the instance JSON to a repo
   * when the skill is also inside the project.
   */
  skillPath?: SkillPathRef;
}

export interface WorkflowGate {
  token: string;
  transitionKey: string;
  from: string;
  to: string;
  kind: string;
  issuedAt: string;
}

export interface WorkflowGateAck extends WorkflowGate {
  approver: string;
  note?: string;
  acknowledgedAt: string;
}

export interface SkillPathRef {
  /** Path relative to the parent of the state directory. Set only when the skill is under that parent. */
  relative?: string;
  /** Absolute path resolved at create time. Always set. */
  absolute: string;
}

export interface InstanceSummary {
  id: string;
  name: string;
  defName: string;
  defVersion: string;
  phase: string;
  stateVersion: number;
}

export function summarizeInstance(instance: WorkflowInstance): InstanceSummary {
  return {
    id: instance.id,
    name: instance.name,
    defName: instance.defName,
    defVersion: instance.defVersion,
    phase: instance.phase,
    stateVersion: instance.stateVersion,
  };
}
