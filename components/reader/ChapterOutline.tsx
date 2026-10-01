'use client';

import React from 'react';
import { X, Check } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Chapter } from '@/lib/db/types';

interface ChapterOutlineProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  currentIndex: number;
  progress: Record<string, number>;
  noteCounts: Record<string, number>;
  onSelect: (index: number) => void;
}

/** Right-hand sheet (bottom-aligned full width on phones) listing chapters with read progress. */
export function ChapterOutline({
  isOpen,
  onClose,
  chapters,
  currentIndex,
  progress,
  noteCounts,
  onSelect,
}: ChapterOutlineProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Chapters"
      hideTitle
      placement="right"
      panelClassName="w-full sm:w-96 h-full bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 text-stone-900 dark:text-stone-100"
    >
      <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 shrink-0">
        <h3 className="text-sm font-bold">Chapters</h3>
        <button
          onClick={onClose}
          aria-label="Close chapters"
          className="p-2 -m-1 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav aria-label="Chapters" className="flex-1 overflow-y-auto overscroll-contain p-2">
        <ol className="space-y-0.5">
          {chapters.map((ch, idx) => {
            const frac = Math.min(1, Math.max(0, progress[ch.id] ?? 0));
            const done = frac >= 0.95;
            const notes = noteCounts[ch.id] ?? 0;
            const isCurrent = idx === currentIndex;
            return (
              <li key={ch.id}>
                <button
                  data-autofocus={isCurrent ? true : undefined}
                  aria-current={isCurrent ? 'location' : undefined}
                  onClick={() => {
                    onSelect(idx);
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-3 ${
                    isCurrent ? 'bg-stone-100 dark:bg-stone-800' : 'hover:bg-stone-50 dark:hover:bg-stone-800/60'
                  }`}
                >
                  <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full border border-stone-300 dark:border-stone-600 flex items-center justify-center text-xs tabular-nums text-stone-600 dark:text-stone-400">
                    {done ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" /> : idx + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm leading-snug ${isCurrent ? 'font-semibold' : 'font-medium'}`}>{ch.title}</span>
                    <span className="block text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                      Pages {ch.startPage}–{ch.endPage}
                      {frac > 0 && !done ? ` · ${Math.round(frac * 100)}% read` : ''}
                      {done ? ' · Read' : ''}
                      {notes > 0 ? ` · ${notes} ${notes === 1 ? 'note' : 'notes'}` : ''}
                    </span>
                    {frac > 0 && !done && (
                      <span aria-hidden="true" className="mt-1.5 block h-1 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                        <span className="block h-full w-full origin-left bg-stone-700 dark:bg-stone-300" style={{ transform: `scaleX(${frac})` }} />
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </Dialog>
  );
}
