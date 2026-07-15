export function formatAuditActor(
  updatedBy: number | null | undefined,
  createdBy: number | null | undefined,
): string {
  const actor = updatedBy ?? createdBy;
  return actor ? `User #${actor}` : "System/unknown";
}

/** Format audit timestamps in the user's local timezone, not UTC. */
export function formatAuditTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}`;
}
