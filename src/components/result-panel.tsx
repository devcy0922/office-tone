"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copy as ui } from "@/lib/copy";
import { cn } from "@/lib/utils";

export function ResultPanel({
  candidates,
  preserved,
  onRetry,
}: {
  candidates: string[];
  preserved: string[];
  onRetry: () => void;
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  async function handleCopy(text: string, index: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1600);
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-orange-800/80">{ui.resultTitle}</p>
          {candidates.length > 1 ? <p className="mt-1 text-xs text-stone-500">{ui.resultHint}</p> : null}
        </div>
        <Button type="button" variant="outline" size="sm" className="h-9 rounded-full px-3.5" onClick={onRetry}>
          {ui.retry}
        </Button>
      </div>

      <div className="space-y-3">
        {candidates.map((text, index) => {
          const copied = copiedIndex === index;
          return (
            <article
              key={`${index}-${text.slice(0, 24)}`}
              className="rounded-3xl border border-stone-200/80 bg-white p-4 shadow-[0_12px_40px_-24px_rgba(28,25,23,0.35)] md:p-5"
            >
              <p className="whitespace-pre-wrap text-[16px] leading-7 text-stone-800 md:text-[17px] md:leading-8">
                {text}
              </p>
              <div className="mt-4">
                <Button
                  type="button"
                  size="lg"
                  className={cn("h-10 rounded-full px-4 text-[13px]", copied && "bg-stone-800")}
                  onClick={() => handleCopy(text, index)}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? ui.copied : ui.copy}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {preserved.length > 0 ? (
        <div className="rounded-2xl border border-stone-100 bg-white/70 px-4 py-3">
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {ui.preservedTitle}
            <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
          </button>
          {open ? (
            <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
              {preserved.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-orange-400" />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
