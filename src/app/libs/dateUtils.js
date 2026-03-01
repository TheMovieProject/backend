"use client";

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "2-digit",
  year: "numeric",
});

const RELATIVE_UNITS = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
  { unit: "second", ms: 1000 },
];

function toDate(value) {
  if (value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRelativeTime(value, options = {}) {
  const date = toDate(value);
  if (!date) return "";

  const diff = date.getTime() - Date.now();
  const absDiff = Math.abs(diff);

  for (const { unit, ms } of RELATIVE_UNITS) {
    if (absDiff >= ms || unit === "second") {
      const rounded = Math.round(diff / ms);
      const formatted = relativeTimeFormatter.format(rounded, unit);
      return options.addSuffix ? formatted : formatted.replace(/\sago$|^in\s/, "");
    }
  }

  return "";
}

export function subtractHours(value, hours) {
  const date = toDate(value) ?? new Date();
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

export function isAfterDate(left, right) {
  const leftDate = toDate(left);
  const rightDate = toDate(right);
  if (!leftDate || !rightDate) return false;
  return leftDate.getTime() > rightDate.getTime();
}

export function formatLongDate(value) {
  const date = toDate(value);
  if (!date) return "Unknown";
  return longDateFormatter.format(date);
}
