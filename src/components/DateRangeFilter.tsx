import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PRESET_LABELS, RANGE_PRESETS, type RangePreset, type RangeValue, resolveRange } from "@/lib/date-range";

type Props = {
  value: RangeValue;
  onChange: (v: RangeValue) => void;
  className?: string;
};

const toIso = (d?: Date) => (d ? format(d, "yyyy-MM-dd") : undefined);

export function DateRangeFilter({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const resolved = resolveRange(value);
  const customLabel =
    value.range === "custom" && (value.from || value.to)
      ? `${value.from ? format(new Date(value.from), "dd MMM") : "…"} – ${value.to ? format(new Date(value.to), "dd MMM") : "…"}`
      : null;

  const handlePreset = (r: string) => {
    const next = r as RangePreset;
    if (next === "custom") { setOpen(true); onChange({ range: "custom", from: value.from, to: value.to }); return; }
    onChange({ range: next });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={value.range} onValueChange={handlePreset}>
        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {RANGE_PRESETS.map((p) => (
            <SelectItem key={p} value={p}>{PRESET_LABELS[p]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.range === "custom" && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {customLabel ?? "Pick dates"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              numberOfMonths={2}
              defaultMonth={resolved.from ?? new Date()}
              selected={{ from: resolved.from ?? undefined, to: resolved.to ?? undefined }}
              onSelect={(r: any) => {
                onChange({ range: "custom", from: toIso(r?.from), to: toIso(r?.to) });
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// Zod-friendly shape for validateSearch
import { z } from "zod";
import { fallback } from "@tanstack/zod-adapter";
export const rangeSearchShape = {
  range: fallback(z.enum(RANGE_PRESETS as [RangePreset, ...RangePreset[]]), "all" as const).default("all"),
  from: fallback(z.string().optional(), undefined).default(undefined),
  to: fallback(z.string().optional(), undefined).default(undefined),
};
