"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CommunicationMeta, Refinement } from "@/lib/ai/types";
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
  preserved,
  rawReply,
  meta,
  onRetry,
  onRefine,
}: {
  candidates: string[];
  preserved: string[];
  rawReply: string;
  meta?: CommunicationMeta;
  onRetry: () => void;
  onRefine: (refinement: Refinement) => void;
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  async function handleCopy(text: string, index: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1600);
  }

  async function handleShare() {
    const text = `내 속마음\n${rawReply}\n\n회사에서 실제로 보낼 말\n${candidates[0]}\n\nOffice Tone`;
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
          {candidates.length > 1 ? <p className="mt-1 text-xs text-stone-500">{ui.resultHint}</p> : null}
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

      <article className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_12px_40px_-24px_rgba(28,25,23,0.35)]">
        <p className="whitespace-pre-wrap text-[17px] leading-8 text-stone-900">{candidates[0]}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" size="lg" className="h-10 rounded-full px-4 text-[13px]" onClick={() => handleCopy(candidates[0], 0)}>
            {copiedIndex === 0 ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copiedIndex === 0 ? ui.copied : ui.copy}
          </Button>
          <Button type="button" variant="outline" size="lg" className="h-10 rounded-full px-4 text-[13px]" onClick={() => setShareOpen((v) => !v)}>
            <Share2 className="size-4" /> {ui.share}
          </Button>
        </div>
      </article>

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

      {candidates.length > 1 ? (
        <details className="rounded-2xl border border-stone-100 bg-white/70 px-4 py-3">
          <summary className="cursor-pointer text-sm text-stone-600">다른 표현 {candidates.length - 1}개 보기</summary>
          <div className="mt-3 space-y-3">
            {candidates.slice(1).map((text, index) => (
              <div key={`${index}-${text.slice(0, 24)}`} className="rounded-2xl bg-stone-50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{text}</p>
                <button type="button" className="mt-2 text-xs font-medium text-stone-500" onClick={() => handleCopy(text, index + 1)}>
                  {copiedIndex === index + 1 ? "복사했어요" : "복사"}
                </button>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {shareOpen ? (
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
          <img src="/share/default.svg" alt="Office Tone 공유 카드 대표 이미지" className="h-28 w-full object-cover" />
          <div className="space-y-3 p-4">
            <div><p className="text-[11px] font-semibold text-stone-400">내 속마음</p><p className="mt-1 line-clamp-2 text-sm text-stone-700">{rawReply}</p></div>
            <div><p className="text-[11px] font-semibold text-orange-700">회사에서 실제로 보낼 말</p><p className="mt-1 text-sm leading-6 text-stone-900">{candidates[0]}</p></div>
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
