"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  outputModeFor,
  OUTPUT_MODES,
  resolvedEndingStyleFor,
  temperatureBandFor,
} from "@/lib/ai/generation-contracts";
import type {
  CommunicationMeta,
  EndingStyleId,
  OutputModeId,
  Refinement,
  ResolvedEndingStyleId,
  RewriteModeResults,
} from "@/lib/ai/types";
import { copy as ui } from "@/lib/copy";
import { cn } from "@/lib/utils";

const refinementActions: Array<{ id: Refinement; label: string }> = [
  { id: "softer", label: "조금 부드럽게" },
  { id: "firmer", label: "더 단호하게" },
  { id: "shorter", label: "더 짧게" },
  { id: "politer", label: "더 정중하게" },
];

export function ResultPanel({
  candidates,
  results,
  preserved,
  rawReply,
  meta,
  temperature,
  temperatureBand,
  requestedEndingStyle,
  resolvedEndingStyle,
  onRetry,
  onRefine,
}: {
  candidates: string[];
  results?: RewriteModeResults;
  preserved: string[];
  rawReply: string;
  meta?: CommunicationMeta;
  temperature: number;
  temperatureBand?: string;
  requestedEndingStyle: EndingStyleId;
  resolvedEndingStyle?: ResolvedEndingStyleId;
  onRetry: () => void;
  onRefine: (refinement: Refinement) => void;
}) {
  const [copiedMode, setCopiedMode] = useState<OutputModeId | null>(null);
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const modeResults: RewriteModeResults = results ?? {
    sendable: candidates[0] ?? "",
    pointed: candidates[1] ?? candidates[0] ?? "",
    inner: candidates[2] ?? rawReply,
  };
  const bandLabel = temperatureBand ?? temperatureBandFor(temperature).label;
  const styleLabel = resolvedEndingStyle
    ? resolvedEndingStyleFor(resolvedEndingStyle).shortLabel
    : requestedEndingStyle === "auto"
      ? "자동"
      : resolvedEndingStyleFor(requestedEndingStyle).shortLabel;

  async function handleCopy(text: string, mode: OutputModeId) {
    await navigator.clipboard.writeText(text);
    setCopiedMode(mode);
    window.setTimeout(() => setCopiedMode(null), 1600);
  }

  async function handleShare() {
    const text = `내 속마음\n${modeResults.inner}\n\n뼈 있게 보내기\n${modeResults.pointed}\n\n실제로 보내기\n${modeResults.sendable}\n\nOffice Tone`;
    if (navigator.share) {
      await navigator.share({ title: "Office Tone", text }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(text);
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-orange-800/80">{ui.resultTitle}</p>
          <p className="mt-1 text-xs text-stone-500">같은 입장이지만 목적과 말맛이 다른 세 가지 결과예요.</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-9 rounded-full px-3.5" onClick={onRetry}>
          {ui.retry}
        </Button>
      </div>

      {meta ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <span>{ui.detected}</span>
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">{meta.intent}</span>
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">{meta.audience}</span>
        </div>
      ) : null}

      <div className="space-y-3">
        {OUTPUT_MODES.map((mode) => {
          const text = modeResults[mode.id];
          const inner = mode.id === "inner";
          return (
            <article
              key={mode.id}
              className={cn(
                "rounded-3xl border p-5 shadow-[0_12px_40px_-24px_rgba(28,25,23,0.35)]",
                mode.id === "sendable" && "border-stone-200/80 bg-white",
                mode.id === "pointed" && "border-orange-200 bg-orange-50/60",
                inner && "border-stone-800 bg-stone-900 text-white",
              )}
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-sm font-semibold", inner ? "text-white" : "text-stone-900")}>{mode.label}</p>
                    {inner ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-stone-200">공유/카타르시스용</span> : null}
                  </div>
                  <p className={cn("mt-1 text-xs", inner ? "text-stone-400" : "text-stone-500")}>
                    {bandLabel} · {styleLabel} · {outputModeFor(mode.id).label}
                  </p>
                </div>
                <span className={cn("text-[11px]", inner ? "text-stone-400" : "text-stone-400")}>{mode.description}</span>
              </div>
              <p className={cn("whitespace-pre-wrap text-[16px] leading-7", inner ? "text-stone-50" : "text-stone-900")}>{text}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={inner ? "secondary" : "default"}
                  className="h-9 rounded-full px-3.5 text-[12px]"
                  onClick={() => handleCopy(text, mode.id)}
                >
                  {copiedMode === mode.id ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copiedMode === mode.id ? ui.copied : ui.copy}
                </Button>
                {inner ? (
                  <Button type="button" variant="secondary" size="sm" className="h-9 rounded-full px-3.5 text-[12px]" onClick={() => setShareOpen((v) => !v)}>
                    <Share2 className="size-4" /> {ui.share}
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-stone-500">조금만 바꾸고 싶다면</p>
        <div className="flex flex-wrap gap-2">
          {refinementActions.map((action) => (
            <button key={action.id} type="button" onClick={() => onRefine(action.id)} className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 hover:border-stone-400">
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {shareOpen ? (
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
          <img src="/share/default.svg" alt="Office Tone 공유 카드 대표 이미지" className="h-28 w-full object-cover" />
          <div className="space-y-3 p-4">
            <div>
              <p className="text-[11px] font-semibold text-stone-400">내 속마음 · 공유/카타르시스용</p>
              <p className="mt-1 line-clamp-3 text-sm text-stone-700">{modeResults.inner}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-orange-700">실제로 보내기</p>
              <p className="mt-1 text-sm leading-6 text-stone-900">{modeResults.sendable}</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={handleShare}>공유하기</Button>
          </div>
        </div>
      ) : null}

      {preserved.length > 0 ? (
        <div className="rounded-2xl border border-stone-100 bg-white/70 px-4 py-3">
          <button type="button" className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {ui.preservedTitle}<ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
          </button>
          {open ? <ul className="mt-3 space-y-1.5 text-sm text-stone-600">{preserved.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-orange-400" />{item}</li>)}</ul> : null}
        </div>
      ) : null}
    </section>
  );
}
