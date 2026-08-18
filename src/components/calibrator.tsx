"use client";

import { useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { PresetRow } from "@/components/preset-row";
import { ResultPanel } from "@/components/result-panel";
import { ToneSlider } from "@/components/tone-slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QUICK_INTENTS, type QuickIntent, type ToneParameters } from "@/lib/ai/types";
import { copy as ui } from "@/lib/copy";
import { DEFAULT_TONE } from "@/lib/presets";
import { cn } from "@/lib/utils";

interface RewriteResponse {
  rewritten: string;
  preserved: string[];
  requestId: string;
}

export function Calibrator() {
  const [text, setText] = useState("");
  const [tone, setTone] = useState<ToneParameters>(DEFAULT_TONE);
  const [intent, setIntent] = useState<QuickIntent | undefined>();
  const [result, setResult] = useState<RewriteResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = text.trim().length > 0 && !loading;

  const helper = useMemo(() => {
    if (!result) return null;
    return "슬라이더를 움직인 뒤 다시 다듬을 수 있어요.";
  }, [result]);

  async function runRewrite() {
    if (!text.trim()) {
      setError(ui.empty);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          ...tone,
          intent,
        }),
      });
      const payload = (await response.json()) as RewriteResponse & {
        error?: { message?: string };
      };
      if (!response.ok) {
        setResult(null);
        setError(payload.error?.message || ui.error);
        return;
      }
      setResult(payload);
    } catch {
      setResult(null);
      setError(ui.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={ui.placeholder}
          rows={7}
          className="min-h-40 rounded-3xl border-stone-200 bg-white px-4 py-4 text-[16px] leading-7 shadow-[0_8px_30px_-18px_rgba(28,25,23,0.35)] md:min-h-48 md:px-5 md:py-5 md:text-[17px]"
          aria-label="하고 싶은 말을 그대로 적어주세요"
        />
        <p className="mt-3 text-xs leading-5 text-stone-500">{ui.privacy}</p>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-[15px] font-medium text-stone-800">{ui.temperature}</h2>
          <p className="mt-1 text-sm text-stone-500">{ui.support}</p>
        </div>
        <div className="space-y-7 rounded-3xl border border-stone-200/80 bg-white/80 p-5 md:p-6">
          <ToneSlider
            id="directness"
            label={ui.directness}
            low={ui.directnessLow}
            high={ui.directnessHigh}
            value={tone.directness}
            onChange={(directness) => setTone((prev) => ({ ...prev, directness }))}
          />
          <ToneSlider
            id="defensiveness"
            label={ui.defensiveness}
            low={ui.defensivenessLow}
            high={ui.defensivenessHigh}
            value={tone.defensiveness}
            onChange={(defensiveness) => setTone((prev) => ({ ...prev, defensiveness }))}
          />
          <ToneSlider
            id="business"
            label={ui.business}
            low={ui.businessLow}
            high={ui.businessHigh}
            value={tone.business}
            onChange={(business) => setTone((prev) => ({ ...prev, business }))}
          />
        </div>
        <PresetRow value={tone} onChange={setTone} />
      </section>

      <section className="space-y-3">
        <p className="text-xs text-stone-500">{ui.intentHint}</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_INTENTS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setIntent((current) => (current === item ? undefined : item))}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] transition",
                intent === item
                  ? "border-stone-800 bg-stone-800 text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-400",
              )}
            >
              + {item}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col items-stretch gap-3 sm:items-start">
        <Button
          type="button"
          size="lg"
          className="h-12 rounded-full px-6 text-[15px]"
          disabled={!canSubmit}
          onClick={runRewrite}
        >
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {loading ? ui.loading : ui.cta}
        </Button>
        {helper ? <p className="text-sm text-stone-500">{helper}</p> : null}
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {result ? (
        <ResultPanel rewritten={result.rewritten} preserved={result.preserved} onRetry={runRewrite} />
      ) : null}
    </div>
  );
}
