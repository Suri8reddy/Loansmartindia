// Shared date-range helpers used by the DateRangeFilter component.

export type RangePreset =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "custom";

export const PRESET_LABELS: Record<RangePreset, string> = {
  all: "All time",
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  this_month: "This month",
  last_month: "Last month",
  this_quarter: "This quarter",
  this_year: "This year",
  custom: "Custom",
};

export type RangeValue = {
  range: RangePreset;
  from?: string; // ISO date (yyyy-mm-dd)
  to?: string;   // ISO date (yyyy-mm-dd) inclusive
};

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

export function resolveRange(v: RangeValue): { from: Date | null; to: Date | null } {
  const now = new Date();
  switch (v.range) {
    case "today": return { from: startOfDay(now), to: endOfDay(now) };
    case "7d": { const f = new Date(now); f.setDate(f.getDate() - 6); return { from: startOfDay(f), to: endOfDay(now) }; }
    case "30d": { const f = new Date(now); f.setDate(f.getDate() - 29); return { from: startOfDay(f), to: endOfDay(now) }; }
    case "this_month": return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) };
    case "last_month": {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const t = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: startOfDay(f), to: endOfDay(t) };
    }
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { from: startOfDay(new Date(now.getFullYear(), q * 3, 1)), to: endOfDay(now) };
    }
    case "this_year": return { from: startOfDay(new Date(now.getFullYear(), 0, 1)), to: endOfDay(now) };
    case "custom":
      return {
        from: v.from ? startOfDay(new Date(v.from)) : null,
        to: v.to ? endOfDay(new Date(v.to)) : null,
      };
    case "all":
    default:
      return { from: null, to: null };
  }
}

export function inRange(dateStr: string | null | undefined, v: RangeValue): boolean {
  if (!dateStr) return true;
  const { from, to } = resolveRange(v);
  if (!from && !to) return true;
  const t = new Date(dateStr).getTime();
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
}

// For URL search-param schemas (use zod fallback on top of this).
export const RANGE_PRESETS: RangePreset[] = [
  "all", "today", "7d", "30d", "this_month", "last_month", "this_quarter", "this_year", "custom",
];
