"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copy as ui } from "@/lib/copy";

export function ResultPanel({
  rewritten,
  preserved,
  onRetry,
}: {
  rewritten: string;
  preserved: string[];
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(rewritten);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_12px_40px_-24px_rgba(28,25,23,0.35)] md:p-7">
      <p className="text-sm font-medium text-orange-800/80">{ui.resultTitle}</p>
      <p className="mt-4 whitespace-pre-wrap text-[17px] leading-8 text-stone-800">{rewritten}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button type="button" size="lg" className="h-11 rounded-full px-5" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? ui.copied : ui.copy}
        </Button>
        <Button type="button" variant="outline" size="lg" className="h-11 rounded-full px-5" onClick={onRetry}>
          {ui.retry}
        </Button>
      </div>
      {preserved.length > 0 ? (
        <div className="mt-5 border-t border-stone-100 pt-4">
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
