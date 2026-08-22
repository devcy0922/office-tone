"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, LoaderCircle, Plus } from "lucide-react";

import { PresetRow } from "@/components/preset-row";
import { ResultPanel } from "@/components/result-panel";
import { ToneSlider } from "@/components/tone-slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  CommunicationMeta,
  EndingStyleId,
  Refinement,
  ResolvedEndingStyleId,
  RewriteModeResults,
  ToneParameters,
} from "@/lib/ai/types";
import {
  DEFAULT_ENDING_STYLE,
  DEFAULT_TEMPERATURE,
  ENDING_STYLES,
} from "@/lib/ai/generation-contracts";
import { copy as ui } from "@/lib/copy";
import { DEFAULT_TONE } from "@/lib/presets";
import { summarizeTone } from "@/lib/tone-summary";
import { cn } from "@/lib/utils";

interface RewriteResponse {
  rewritten: string;
  candidates?: string[];
  results?: RewriteModeResults;
  preserved: string[];
  requestId: string;
  meta?: CommunicationMeta;
  endingStyle?: ResolvedEndingStyleId;
  temperatureBand?: string;
}

export function Calibrator() {
  const [rawReply, setRawReply] = useState("");
  const [context, setContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tone, setTone] = useState<ToneParameters>(DEFAULT_TONE);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [endingStyle, setEndingStyle] = useState<EndingStyleId>(DEFAULT_ENDING_STYLE);
  const [result, setResult] = useState<RewriteResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const canSubmit = rawReply.trim().length > 0 && !loading;
  const candidates = result?.candidates?.length ? result.candidates : result?.rewritten ? [result.rewritten] : [];
  const toneLine = useMemo(() => summarizeTone(tone), [tone]);
  const contextOpen = showContext || context.trim().length > 0;

  async function runRewrite(refinement?: Refinement) {
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
          temperature,
          endingStyle,
          refinement,
        }),
      });
      const payload = (await response.json()) as RewriteResponse & { error?: { message?: string } };
      if (!response.ok) {
        setResult(null);
        setError(payload.error?.message || ui.error);
        return;
      }
      setResult(payload);
      window.requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } catch {
      setResult(null);
      setError(ui.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="space-y-4 rounded-3xl border border-stone-200/80 bg-white p-4 shadow-[0_12px_40px_-24px_rgba(28,25,23,0.35)] md:p-5">
        {contextOpen ? (
          <div className="space-y-2 rounded-2xl bg-stone-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="context" className="text-[13px] font-semibold text-stone-600">{ui.contextLabel}</label>
              {!context.trim() ? <button type="button" onClick={() => setShowContext(false)} className="text-xs text-stone-400">닫기</button> : null}
            </div>
            <p className="text-xs leading-5 text-stone-500">{ui.contextHint}</p>
            <Textarea id="context" value={context} onChange={(event) => setContext(event.target.value)} placeholder={ui.placeholderContext} rows={3} className="field-sizing-fixed max-h-36 min-h-20 rounded-2xl border-stone-200 bg-white px-4 py-3 text-[15px] leading-6 shadow-none" />
          </div>
        ) : (
          <button type="button" onClick={() => setShowContext(true)} className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900">
            <Plus className="size-4" /> {ui.contextToggle}
          </button>
        )}

        <div className="space-y-2">
          <label htmlFor="rawReply" className="text-[16px] font-semibold text-stone-900">{ui.rawReplyLabel}</label>
          <p className="text-sm text-stone-500">{ui.rawReplyHint}</p>
          <Textarea id="rawReply" value={rawReply} onChange={(event) => setRawReply(event.target.value)} placeholder={ui.placeholderRawReply} rows={6} className="field-sizing-fixed max-h-56 min-h-36 rounded-3xl border-stone-200 bg-stone-50/70 px-4 py-3 text-[16px] leading-7 shadow-none md:px-5 md:text-[17px]" />
        </div>
        <p className="text-xs leading-5 text-stone-400">{ui.privacy}</p>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-[16px] font-semibold text-stone-900">{ui.temperature}</h2>
          <p className="mt-1 text-sm text-stone-500">{ui.support}</p>
        </div>
        <PresetRow
          value={tone}
          temperature={temperature}
          onChange={(nextTone, nextTemperature) => {
            setTone(nextTone);
            setTemperature(nextTemperature);
          }}
        />

        <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800" aria-expanded={showAdvanced}>
          {ui.advanced}<ChevronDown className={`size-4 transition ${showAdvanced ? "rotate-180" : ""}`} />
        </button>

        {showAdvanced ? (
          <div className="space-y-5 rounded-3xl border border-stone-200/80 bg-white/80 p-4 md:p-5">
            <ToneSlider id="directness" label={ui.directness} low={ui.directnessLow} high={ui.directnessHigh} value={tone.directness} onChange={(directness) => setTone((prev) => ({ ...prev, directness }))} />
            <ToneSlider id="defensiveness" label={ui.defensiveness} low={ui.defensivenessLow} high={ui.defensivenessHigh} value={tone.defensiveness} onChange={(defensiveness) => setTone((prev) => ({ ...prev, defensiveness }))} />
            <ToneSlider id="business" label={ui.business} low={ui.businessLow} high={ui.businessHigh} value={tone.business} onChange={(business) => setTone((prev) => ({ ...prev, business }))} />
            <p className="text-sm leading-6 text-stone-600" data-testid="tone-summary">{toneLine}</p>

            <div className="border-t border-stone-100 pt-4">
              <div className="mb-3">
                <p className="text-[15px] font-medium text-stone-800">말끝</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">종결어미만 바꾸지 않고, 어휘와 리듬까지 이 스타일로 다시 만들어요.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ENDING_STYLES.map((style) => {
                  const active = endingStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      aria-pressed={active}
                      className={cn(
                        "rounded-2xl border px-3 py-2.5 text-left transition",
                        active
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-200 bg-white text-stone-700 hover:border-stone-400",
                      )}
                      onClick={() => setEndingStyle(style.id)}
                    >
                      <span className="block text-sm font-semibold">{style.label}</span>
                      <span className={cn("mt-0.5 block text-[11px] leading-4", active ? "text-stone-300" : "text-stone-500")}>
                        {style.usage}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <div className="sticky bottom-0 z-20 -mx-5 border-t border-stone-200/80 bg-background/95 px-5 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        <Button type="button" size="lg" className="h-12 w-full rounded-full px-6 text-[15px]" disabled={!canSubmit} onClick={() => runRewrite()}>
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {loading ? ui.loading : ui.cta}
        </Button>
        {error ? <p className="mt-2 text-sm text-red-700" role="alert">{error}</p> : null}
      </div>

      <div ref={resultRef}>
        {candidates.length ? (
          <ResultPanel
            candidates={candidates}
            results={result?.results}
            preserved={result?.preserved ?? []}
            rawReply={rawReply}
            meta={result?.meta}
            temperature={temperature}
            temperatureBand={result?.temperatureBand}
            requestedEndingStyle={endingStyle}
            resolvedEndingStyle={result?.endingStyle}
            onRetry={() => runRewrite()}
            onRefine={(refinement) => runRewrite(refinement)}
          />
        ) : null}
      </div>
    </div>
  );
}
