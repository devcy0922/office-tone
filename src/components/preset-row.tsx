"use client";

import { PRESETS } from "@/lib/presets";
import type { ToneParameters } from "@/lib/ai/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PresetRow({
  value,
  onChange,
}: {
  value: ToneParameters;
  onChange: (next: ToneParameters) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((preset) => {
        const active =
          value.directness === preset.directness &&
          value.defensiveness === preset.defensiveness &&
          value.business === preset.business;
        return (
          <Button
            key={preset.id}
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            className={cn("h-9 rounded-full px-3.5 text-[13px]", active && "shadow-sm")}
            onClick={() =>
              onChange({
                directness: preset.directness,
                defensiveness: preset.defensiveness,
                business: preset.business,
              })
            }
          >
            {preset.label}
          </Button>
        );
      })}
    </div>
  );
}
