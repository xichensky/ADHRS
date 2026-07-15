// Typed errors for the HRS domain. Each carries a stable `code` + user-facing
// `message`, surfaced to the UI by Server Actions / Route Handlers.

export type HrsErrorCode =
  | "UNIQUE_VIOLATION"
  | "LAST_VERSION_PROTECTED"
  | "DUPLICATE_EFFECTIVE_DATE"
  | "CODE_GENERATION_FAILED"
  | "CMS_ERROR"
  | "NOT_FOUND"
  | "VALIDATION_ERROR";

export class HrsError extends Error {
  readonly code: HrsErrorCode;
  constructor(code: HrsErrorCode, message: string) {
    super(message);
    this.name = "HrsError";
    this.code = code;
  }
}

export class UniqueViolationError extends HrsError {
  constructor(field: string, value: string) {
    super(
      "UNIQUE_VIOLATION",
      `${field} "${value}" already exists. Please check or use a different value.`,
    );
  }
}

export class LastVersionProtectionError extends HrsError {
  constructor(entity: string) {
    super(
      "LAST_VERSION_PROTECTED",
      `This is the last version in the ${entity} and cannot be deleted.`,
    );
  }
}

export class DuplicateEffectiveDateError extends HrsError {
  constructor(entity: string) {
    super(
      "DUPLICATE_EFFECTIVE_DATE",
      `There are versions with the same Effective Date for this ${entity}. Please check.`,
    );
  }
}

export class CodeGenerationError extends HrsError {
  constructor(detail: string) {
    super("CODE_GENERATION_FAILED", `Failed to generate code: ${detail}`);
  }
}

export class CmsError extends HrsError {
  constructor(detail: string) {
    super("CMS_ERROR", `CMS integration error: ${detail}`);
  }
}

export class NotFoundError extends HrsError {
  constructor(entity: string, id: string | number) {
    super("NOT_FOUND", `${entity} ${id} not found.`);
  }
}

export class ValidationError extends HrsError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
  }
}

/** Convert any thrown value into a serializable {code, message} for the UI. */
export function toErrorResult(err: unknown): { code: string; message: string } {
  if (err instanceof HrsError) return { code: err.code, message: err.message };
  if (err instanceof Error) return { code: "INTERNAL", message: err.message };
  return { code: "INTERNAL", message: "Unexpected error." };
}
