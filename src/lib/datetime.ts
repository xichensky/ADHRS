// UTC date helpers. HRS stores/compares everything in UTC; the daily scheduler
// computes the "UTC day start" exactly as the source report does.
//
// NOTE: we avoid the `Date` constructor with multi-arg locals and the deprecated
// `getDay`/local getters; everything is UTC-explicit.

/** Normalize any date-like input to a UTC midnight DateTime (date-only semantics). */
export function toMidnightUtc(d: Date | string): Date {
  const date = typeof d === "string" ? new Date(d) : new Date(d.getTime());
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Start of the current UTC day (00:00 UTC). */
export function startOfUtcDay(d: Date = new Date()): Date {
  return toMidnightUtc(d);
}

/** Start of the NEXT UTC day (exclusive upper bound for "today"). */
export function startOfNextUtcDay(d: Date = new Date()): Date {
  const start = startOfUtcDay(d);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

/** Previous UTC calendar day, normalized to midnight. */
export function previousUtcDay(d: Date | string): Date {
  return new Date(toMidnightUtc(d).getTime() - 24 * 60 * 60 * 1000);
}

/** Are two date-only values the same UTC calendar day? */
export function isSameUtcDay(a: Date | string, b: Date | string): boolean {
  return toMidnightUtc(a).getTime() === toMidnightUtc(b).getTime();
}

/** Format a Date as YYYY-MM-DD (UTC) for inputs/labels. */
export function toIsoDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

/** Format a Date for display: YYYY-MM-DD HH:mm (UTC). */
export function toDateTimeLabel(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 16).replace("T", " ");
}

/** Whole-year age from a birth date (UTC). Returns null if unknown/in future. */
export function computeAge(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  const b = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age >= 0 ? age : null;
}
