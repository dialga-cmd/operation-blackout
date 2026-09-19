export function formatTimestamp(
  value: string | null | undefined,
  timezone?: string | null
) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const field = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return `${field("year")}-${field("month")}-${field("day")} ${field("hour")}:${field("minute")}:${field("second")} ${field("dayPeriod")}`;
}

export function formatDate(value: string | null | undefined, timezone?: string | null) {
  return formatTimestamp(value, timezone).slice(0, 10);
}