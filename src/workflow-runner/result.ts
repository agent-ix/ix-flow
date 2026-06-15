import type {
  InstanceSummary,
  WorkflowGate,
  WorkflowEvent,
  WorkflowInstance,
} from "../workflow-core/index.js";

export interface WorkflowNextAction {
  command: string;
  description: string;
  required_for?: string;
}

export interface WorkflowResultEnvelope<T = unknown> {
  ok: boolean;
  command: string;
  instance_id?: string;
  state?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
  events: WorkflowEvent[];
  summary?: InstanceSummary;
  current_phase?: string;
  transitions_available?: string[];
  open_gates?: WorkflowGate[];
  state_version?: number;
  def_hash?: string;
  cli_version?: string;
  next_actions?: WorkflowNextAction[];
  nextActions: string[];
  recipe_steps?: Array<{
    index: number;
    command: string;
    ok: boolean;
    state?: string;
  }>;
  /**
   * Per FR-024-AC-8: questions whose `followUpIf` rule matches their
   * persisted answer, surfaced after a transition when a subsequent
   * transition out of the new phase still gates on the same interview.
   * Informational — does not affect pass/fail.
   */
  interview_followups?: Array<{
    interviewId: string;
    questionKey: string;
    prompt: string;
  }>;
}

export function jsonEnvelope<T>(envelope: WorkflowResultEnvelope<T>): string {
  return JSON.stringify(envelope, null, 2);
}

export function nextActionsFor(instance: WorkflowInstance): string[] {
  return [`ix-flow status ${instance.id}`];
}
