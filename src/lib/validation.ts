// Lightweight runtime validation helpers (a full Zod layer is deferred to a
// later phase). validateEnforceEnum rejects values outside the allowed set for
// the categorical String columns (job_level, orgType, employment_type, ...).

import { ValidationError } from "@/lib/errors";

/** Throw ValidationError unless `value` is in `allowed` (or empty/optional). */
export function validateEnum(
  field: string,
  value: string | null | undefined,
  allowed: readonly string[],
): void {
  if (value == null || value === "") return; // optional field left blank
  if (!allowed.includes(value)) {
    throw new ValidationError(
      `${field} "${value}" is invalid. Allowed: ${allowed.join(", ")}.`,
    );
  }
}
