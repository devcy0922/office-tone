"use client";

import { PRESETS } from "@/lib/presets";
import type { ToneParameters } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

export function PresetRow({
  value,
  onChange,
}: {
  value: ToneParameters;
  onChange: (next: ToneParameters) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PRESETS.map((preset) => {
        const active =
          value.directness === preset.directness &&
          value.defensiveness === preset.defensiveness &&
          value.business === preset.business;
        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={active}
            className={cn(
              "rounded-2xl border px-4 py-3 text-left transition",
              active
                ? "border-stone-900 bg-stone-900 text-white shadow-sm"
                : "border-stone-200 bg-white text-stone-800 hover:border-stone-400",
              preset.id === "today" && "sm:col-span-2",
            )}
            onClick={() => onChange({
              directness: preset.directness,
              defensiveness: preset.defensiveness,
              business: preset.business,
            })}
          >
            <span className="block text-sm font-semibold">{preset.label}</span>
            <span className={cn("mt-1 block text-xs leading-5", active ? "text-stone-300" : "text-stone-500")}>
              {preset.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
