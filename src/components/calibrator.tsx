"use client";

import { useMemo, useRef, useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";

import { PresetRow } from "@/components/preset-row";
import { ResultPanel } from "@/components/result-panel";
import { ToneSlider } from "@/components/tone-slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QUICK_INTENTS, type QuickIntent, type ToneParameters } from "@/lib/ai/types";
import { copy as ui } from "@/lib/copy";
import { DEFAULT_TONE } from "@/lib/presets";
import { summarizeTone } from "@/lib/tone-summary";
import { cn } from "@/lib/utils";

interface RewriteResponse {
  rewritten: string;
  candidates?: string[];
  preserved: string[];
  requestId: string;
}

export function Calibrator() {
  const [rawReply, setRawReply] = useState("");
  const [context, setContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [tone, setTone] = useState<ToneParameters>(DEFAULT_TONE);
  const [intent, setIntent] = useState<QuickIntent | undefined>();
  const [result, setResult] = useState<RewriteResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const canSubmit = rawReply.trim().length > 0 && !loading;
  const candidates = result?.candidates?.length ? result.candidates : result?.rewritten ? [result.rewritten] : [];
  const toneLine = useMemo(() => summarizeTone(tone), [tone]);

  const helper = result ? "슬라이더를 움직인 뒤 다시 다듬을 수 있어요." : null;

  async function runRewrite() {
    if (!rawReply.trim()) {
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
          rawReply: rawReply.trim(),
          context: context.trim(),
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

  const contextOpen = showContext || context.trim().length > 0;

  return (
    <div className="space-y-8">
      <section className="space-y-5 rounded-3xl border border-stone-200/80 bg-white p-4 shadow-[0_12px_40px_-24px_rgba(28,25,23,0.35)] md:p-5">
        <div className="space-y-2">
          <label htmlFor="rawReply" className="text-[15px] font-medium text-stone-800">
            {ui.rawReplyLabel}
          </label>
          <p className="text-sm text-stone-500">{ui.rawReplyHint}</p>
          <Textarea
            id="rawReply"
            value={rawReply}
            onChange={(event) => setRawReply(event.target.value)}
            placeholder={ui.placeholderRawReply}
            rows={6}
            className="field-sizing-fixed max-h-56 min-h-32 rounded-3xl border-stone-200 bg-stone-50/70 px-4 py-3 text-[16px] leading-7 shadow-none md:px-5 md:text-[17px]"
            aria-label={ui.rawReplyLabel}
          />
        </div>

        {contextOpen ? (
          <div className="space-y-2 border-t border-stone-100 pt-4">
            <label htmlFor="context" className="text-[15px] font-medium text-stone-800">
              {ui.contextLabel}
            </label>
            <p className="text-sm text-stone-500">{ui.contextHint}</p>
            <Textarea
              id="context"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder={ui.placeholderContext}
              rows={3}
              className="field-sizing-fixed max-h-36 min-h-20 rounded-3xl border-stone-200 bg-stone-50/70 px-4 py-3 text-[16px] leading-7 shadow-none md:px-5 md:text-[17px]"
              aria-label={ui.contextLabel}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowContext(true)}
            className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900"
            aria-expanded={false}
          >
            <Plus className="size-4" />
            {ui.contextToggle}
          </button>
        )}

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
          <p className="text-sm leading-6 text-stone-600" data-testid="tone-summary">
            {toneLine}
          </p>
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

      <div className="sticky bottom-0 z-20 -mx-5 border-t border-stone-200/80 bg-background/95 px-5 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
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

      <div ref={resultRef}>
        {candidates.length ? (
          <ResultPanel candidates={candidates} preserved={result?.preserved ?? []} onRetry={runRewrite} />
        ) : null}
      </div>
    </div>
  );
}
