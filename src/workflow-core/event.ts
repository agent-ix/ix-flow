import { createHash } from "node:crypto";
import { canonicalJson, type JsonValue } from "./canonical.js";

export const GENESIS_HASH = "0".repeat(64);

export interface Actor {
  kind: "agent" | "human" | "service";
  id: string;
  ackToken?: string;
}

export interface WorkflowEvent {
  id: string;
  ts: string;
  actor: Actor;
  kind: string;
  payload: JsonValue;
  prevHash: string;
  hash: string;
}

export interface EventInput {
  id: string;
  ts: string;
  actor: Actor;
  kind: string;
  payload?: JsonValue;
}

export interface ChainVerification {
  ok: boolean;
  firstBreakIndex?: number;
  expectedHash?: string;
  actualHash?: string;
}

export function createEvent(
  input: EventInput,
  prevHash: string,
): WorkflowEvent {
  const event = {
    id: input.id,
    ts: input.ts,
    actor: input.actor,
    kind: input.kind,
    payload: input.payload ?? {},
    prevHash,
  };
  return { ...event, hash: hashEvent(event) };
}

export function hashEvent(
  event: Omit<WorkflowEvent, "hash"> | WorkflowEvent,
): string {
  const payload = {
    id: event.id,
    ts: event.ts,
    actor: event.actor as unknown as JsonValue,
    kind: event.kind,
    payload: event.payload,
    prevHash: event.prevHash,
  };
  return createHash("sha256")
    .update(canonicalJson(payload as JsonValue))
    .digest("hex");
}

export function verifyChain(
  events: readonly WorkflowEvent[],
): ChainVerification {
  let prevHash = GENESIS_HASH;
  for (const [index, event] of events.entries()) {
    if (event.prevHash !== prevHash) {
      return {
        ok: false,
        firstBreakIndex: index,
        expectedHash: prevHash,
        actualHash: event.prevHash,
      };
    }
    const expectedHash = hashEvent(event);
    if (event.hash !== expectedHash) {
      return {
        ok: false,
        firstBreakIndex: index,
        expectedHash,
        actualHash: event.hash,
      };
    }
    prevHash = event.hash;
  }
  return { ok: true };
}
