import type { Interview, Question, QuestionType } from "./definition.js";
import type { JsonValue } from "./canonical.js";

export class InterviewValidationError extends Error {
  constructor(
    public code:
      | "interview_id_unknown"
      | "interview_answer_unknown_key"
      | "interview_answer_type_invalid"
      | "interview_answer_enum_invalid"
      | "interview_answer_min_items",
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

function answerTypeOf(value: JsonValue, type: QuestionType): string | null {
  switch (type) {
    case "text":
      return typeof value === "string" ? null : describeType(value);
    case "list<text>":
      if (!Array.isArray(value)) return describeType(value);
      if (value.some((v) => typeof v !== "string")) return "mixed-array";
      return null;
    case "enum":
      return typeof value === "string" ? null : describeType(value);
    case "bool":
      return typeof value === "boolean" ? null : describeType(value);
    case "int":
      return typeof value === "number" && Number.isInteger(value)
        ? null
        : describeType(value);
  }
}

function describeType(value: JsonValue): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function validateAnswers(
  interview: Interview,
  answers: Record<string, JsonValue>,
): void {
  const declared = new Map<string, Question>();
  for (const q of interview.questions) declared.set(q.key, q);

  const unknownKeys: string[] = [];
  for (const key of Object.keys(answers)) {
    if (!declared.has(key)) unknownKeys.push(key);
  }
  if (unknownKeys.length > 0) {
    throw new InterviewValidationError(
      "interview_answer_unknown_key",
      `interview_answer_unknown_key: ${unknownKeys.join(", ")}`,
      { unknownKeys },
    );
  }

  const typeMismatches: Array<{
    key: string;
    expected: string;
    actual: string;
  }> = [];
  for (const [key, value] of Object.entries(answers)) {
    const q = declared.get(key)!;
    const mismatch = answerTypeOf(value, q.type);
    if (mismatch !== null) {
      typeMismatches.push({ key, expected: q.type, actual: mismatch });
    }
  }
  if (typeMismatches.length > 0) {
    throw new InterviewValidationError(
      "interview_answer_type_invalid",
      `interview_answer_type_invalid`,
      { typeMismatches },
    );
  }

  const enumViolations: Array<{
    key: string;
    value: string;
    options: string[];
  }> = [];
  for (const [key, value] of Object.entries(answers)) {
    const q = declared.get(key)!;
    if (q.type === "enum" && q.options) {
      if (typeof value === "string" && !q.options.includes(value)) {
        enumViolations.push({ key, value, options: q.options });
      }
    }
  }
  if (enumViolations.length > 0) {
    throw new InterviewValidationError(
      "interview_answer_enum_invalid",
      "interview_answer_enum_invalid",
      { enumViolations },
    );
  }

  const minItemsViolations: Array<{
    key: string;
    observed: number;
    minItems: number;
  }> = [];
  for (const [key, value] of Object.entries(answers)) {
    const q = declared.get(key)!;
    if (q.type === "list<text>" && q.minItems !== undefined) {
      const observed = Array.isArray(value) ? value.length : 0;
      if (observed < q.minItems) {
        minItemsViolations.push({ key, observed, minItems: q.minItems });
      }
    }
  }
  if (minItemsViolations.length > 0) {
    throw new InterviewValidationError(
      "interview_answer_min_items",
      "interview_answer_min_items",
      { minItemsViolations },
    );
  }
}

function isNonEmpty(value: JsonValue, type: QuestionType): boolean {
  if (value === undefined || value === null) return false;
  switch (type) {
    case "text":
    case "enum":
      return typeof value === "string" && value.length > 0;
    case "list<text>":
      return Array.isArray(value) && value.length > 0;
    case "bool":
      return typeof value === "boolean";
    case "int":
      return typeof value === "number" && Number.isInteger(value);
  }
}

export interface CompletenessOutcome {
  ok: boolean;
  rule: string;
  missing: string[];
  observedCount: number;
  requiredCount: number;
}

export function evaluateCompleteness(
  interview: Interview,
  answers: Record<string, JsonValue>,
): CompletenessOutcome {
  const rule = interview.completenessRule;
  const declared = new Map<string, Question>();
  for (const q of interview.questions) declared.set(q.key, q);

  if (rule === "all_required") {
    const missing: string[] = [];
    for (const q of interview.questions) {
      if (q.required) {
        const value = answers[q.key];
        if (value === undefined || !isNonEmpty(value, q.type)) {
          missing.push(q.key);
        }
      }
    }
    return {
      ok: missing.length === 0,
      rule,
      missing,
      observedCount: Object.keys(answers).length,
      requiredCount: interview.questions.filter((q) => q.required).length,
    };
  }

  if (rule.startsWith("min_count:")) {
    const n = Number(rule.slice("min_count:".length));
    let observed = 0;
    for (const q of interview.questions) {
      const value = answers[q.key];
      if (value !== undefined && isNonEmpty(value, q.type)) observed += 1;
    }
    return {
      ok: observed >= n,
      rule,
      missing: [],
      observedCount: observed,
      requiredCount: n,
    };
  }

  // custom_invariant — caller is responsible for delegating.
  return {
    ok: true,
    rule,
    missing: [],
    observedCount: 0,
    requiredCount: 0,
  };
}

export interface FollowUp {
  interviewId: string;
  questionKey: string;
  prompt: string;
}

export function collectFollowUps(
  interviewId: string,
  interview: Interview,
  answers: Record<string, JsonValue>,
): FollowUp[] {
  const out: FollowUp[] = [];
  for (const q of interview.questions) {
    if (!q.followUpIf) continue;
    const value = answers[q.key];
    const nonEmpty = value !== undefined && isNonEmpty(value, q.type);
    const match =
      (q.followUpIf === "nonEmpty" && nonEmpty) ||
      (q.followUpIf === "empty" && !nonEmpty);
    if (match) {
      out.push({ interviewId, questionKey: q.key, prompt: q.prompt });
    }
  }
  return out;
}
