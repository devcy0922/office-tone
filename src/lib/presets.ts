import { TEMPERATURE_BANDS } from "@/lib/ai/generation-contracts";
import type { ToneParameters } from "@/lib/ai/types";

export const PRESETS = TEMPERATURE_BANDS.map((band) => ({
  id: band.id,
  label: band.label,
  description: band.description,
  temperature: band.value,
  ...band.tone,
})) satisfies ReadonlyArray<{
  id: string;
  label: string;
  description: string;
  temperature: number;
} & ToneParameters>;

const defaultPreset = PRESETS.find((preset) => preset.id === "neutral") ?? PRESETS[1];

export const DEFAULT_TONE: ToneParameters = {
  directness: defaultPreset.directness,
  defensiveness: defaultPreset.defensiveness,
  business: defaultPreset.business,
};
