export type VersionChange = {
  field: string;
  before: string;
  after: string;
};

export function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function compareField(
  changes: VersionChange[],
  field: string,
  before: string | number | null | undefined,
  after: string | number | null | undefined,
): void {
  const beforeDisplay = displayValue(before);
  const afterDisplay = displayValue(after);
  if (beforeDisplay !== afterDisplay) {
    changes.push({ field, before: beforeDisplay, after: afterDisplay });
  }
}
