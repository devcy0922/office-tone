"use client";

import { Slider } from "@/components/ui/slider";

interface ToneSliderProps {
  id: string;
  label: string;
  low: string;
  high: string;
  value: number;
  onChange: (value: number) => void;
}

export function ToneSlider({ id, label, low, high, value, onChange }: ToneSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-medium tracking-tight text-stone-800">
          {label}
        </label>
        <span className="tabular-nums text-sm text-stone-500" aria-hidden>
          {value}
        </span>
      </div>
      <Slider
        id={id}
        min={0}
        max={100}
        step={1}
        value={value}
        onValueChange={(next) => onChange(typeof next === "number" ? next : next[0] ?? value)}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${label} ${value}, ${value < 50 ? low : high}`}
        className="py-2"
      />
      <div className="flex justify-between text-xs text-stone-500">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
