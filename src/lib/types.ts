// Select-field option lists + helper mappers.
// The source report marks these as NocoBase "select" fields but does not ship
// the option values; these are sensible defaults used to populate the UI
// dropdowns. Treat them as editable data — add/remove options freely.

export const STRUCTURE_TYPES = ["Business", "Administrative"] as const;
export const ORG_TYPES = ["Office", "Business Unit", "Department", "Team"] as const;
export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contractor",
  "Intern",
  "Outsource",
] as const;
export const JOB_LEVELS = [
  "General Staff",
  "Intern",
  "Leader",
  "Manager",
  "Upper Management",
] as const;
export const GENDERS = ["Male", "Female", "Other"] as const;
export const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed"] as const;
export const HEALTH_STATUSES = ["Good", "Fair", "Poor", "Unknown"] as const;
export const DEGREES = [
  "High School",
  "Associate",
  "Bachelor",
  "Master",
  "Doctorate",
  "Other",
] as const;
export const EMERGENCY_RELATIONSHIPS = [
  "Spouse",
  "Parent",
  "Child",
  "Sibling",
  "Relative",
  "Friend",
  "Other",
] as const;
export const PAY_TYPES = ["Monthly", "Annual", "Hourly", "Piece", "Other"] as const;
export const FAMILY_RELATIONSHIPS = [
  "Spouse",
  "Parent",
  "Child",
  "Sibling",
  "Relative",
  "Other",
] as const;
export const CERTIFICATE_TYPES = [
  "Passport",
  "Qualification",
  "DriverLicense",
  "Degree",
  "Other",
] as const;
export const ORG_EVENT_TYPES = [
  "Onboard", // 入职
  "Probation", // 转正
  "Transfer", // 调动 / 调岗
  "Promotion", // 晋升 / 降职
  "SecondaryChange", // 兼任变更
  "Offboard", // 离职
  "Retire", // 退休
  "Rehire", // 复职
  "Other",
] as const;
export const CONTRACT_ACTION_TYPES = ["New", "Renew", "Amend", "Terminate"] as const;
export const CONTRACT_TERM_TYPES = [
  "Fixed-term",
  "Open-ended",
  "Probation",
  "Task-based",
] as const;
export const CONTRACT_STATUSES = [
  "Draft",
  "Pending Signature",
  "Active",
  "Expired",
  "Terminated",
] as const;

export type Option = { value: string; label: string };

export function optionsOf(arr: readonly string[]): Option[] {
  return arr.map((value) => ({ value, label: value }));
}

/** country_name_code formula: "China (CN)". */
export function countryNameCode(name: string, code: string): string {
  return `${name} (${code.toUpperCase()})`;
}
