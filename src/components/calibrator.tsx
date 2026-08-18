"use client";

import { useMemo, useRef, useState } from "react";
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
  candidates?: string[];
  preserved: string[];
  requestId: string;
}

export function Calibrator() {
  const [situation, setSituation] = useState("");
  const [thought, setThought] = useState("");
  const [tone, setTone] = useState<ToneParameters>(DEFAULT_TONE);
  const [intent, setIntent] = useState<QuickIntent | undefined>();
  const [result, setResult] = useState<RewriteResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const canSubmit = (situation.trim().length > 0 || thought.trim().length > 0) && !loading;
  const candidates = result?.candidates?.length ? result.candidates : result?.rewritten ? [result.rewritten] : [];

  const helper = useMemo(() => {
    if (!result) return null;
    return "슬라이더를 움직인 뒤 다시 다듬을 수 있어요.";
  }, [result]);

  async function runRewrite() {
    if (!situation.trim() && !thought.trim()) {
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
          situation: situation.trim(),
          thought: thought.trim(),
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
      window.requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    } catch {
      setResult(null);
      setError(ui.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.92fr)] lg:gap-10">
      <div className="order-2 space-y-6 lg:order-1">
        <section className="space-y-3">
          <label htmlFor="situation" className="text-[15px] font-medium text-stone-800">
            {ui.situationLabel}
          </label>
          <Textarea
            id="situation"
            value={situation}
            onChange={(event) => setSituation(event.target.value)}
            placeholder={ui.placeholderSituation}
            rows={4}
            className="field-sizing-fixed max-h-40 min-h-24 rounded-3xl border-stone-200 bg-white px-4 py-3 text-[16px] leading-7 shadow-[0_8px_30px_-18px_rgba(28,25,23,0.35)] md:px-5 md:text-[17px]"
            aria-label={ui.situationLabel}
          />
        </section>

        <section className="space-y-3">
          <label htmlFor="thought" className="text-[15px] font-medium text-stone-800">
            {ui.thoughtLabel}
          </label>
          <Textarea
            id="thought"
            value={thought}
            onChange={(event) => setThought(event.target.value)}
            placeholder={ui.placeholderThought}
            rows={4}
            className="field-sizing-fixed max-h-40 min-h-24 rounded-3xl border-stone-200 bg-white px-4 py-3 text-[16px] leading-7 shadow-[0_8px_30px_-18px_rgba(28,25,23,0.35)] md:px-5 md:text-[17px]"
            aria-label={ui.thoughtLabel}
          />
          <p className="text-xs leading-5 text-stone-500">{ui.privacy}</p>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-[15px] font-medium text-stone-800">{ui.temperature}</h2>
            <p className="mt-1 text-sm text-stone-500">{ui.support}</p>
          </div>
          <div className="space-y-5 rounded-3xl border border-stone-200/80 bg-white/80 p-4 md:p-5">
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

        <div className="sticky bottom-0 z-20 -mx-5 border-t border-stone-200/80 bg-background/95 px-5 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
          <div className="flex flex-col items-stretch gap-3 sm:items-start">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full rounded-full px-6 text-[15px] sm:w-auto"
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
        </div>
      </div>

      <div
        ref={resultRef}
        className={cn(
          "lg:sticky lg:top-6 lg:max-h-[calc(100vh-4.5rem)] lg:overflow-y-auto",
          candidates.length ? "order-1 lg:order-2" : "order-2 lg:order-2",
        )}
      >
        {candidates.length ? (
          <ResultPanel candidates={candidates} preserved={result?.preserved ?? []} onRetry={runRewrite} />
        ) : (
          <div className="hidden rounded-3xl border border-dashed border-stone-200 bg-white/50 px-5 py-10 text-sm leading-6 text-stone-500 lg:block">
            {ui.waitingResult}
          </div>
        )}
      </div>
    </div>
  );
}
