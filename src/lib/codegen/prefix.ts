// Fn: getCodePrefix — extract the alphabetic prefix from a code.
//   org / employee codes use a city-style prefix:  CNSZ0007  ->  CNSZ
//   position codes use a job-level letter:        L0007     ->  L
// The same rule (leading alphabetic run) covers both.

export function getCodePrefix(code: string): string {
  const m = code.match(/^[A-Za-z]+/);
  return (m ? m[0] : code).toUpperCase();
}

/** Build a zero-padded code: prefix + seq padded to `width` digits. */
export function buildCode(prefix: string, seq: number, width = 4): string {
  return `${prefix.toUpperCase()}${String(seq).padStart(width, "0")}`;
}

/** Parse the numeric sequence out of a code (e.g. CNSZ0007 -> 7). */
export function parseSeq(code: string): number {
  const m = code.match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}
