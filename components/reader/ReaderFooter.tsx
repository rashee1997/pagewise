'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ReaderFooterProps {
  currentIndex: number;
  total: number;
  percent: number;
  onPrev: () => void;
  onNext: () => void;
  onOpenOutline: () => void;
}

const navBtn =
  'inline-flex items-center gap-1.5 px-3 py-2 min-h-10 text-xs font-semibold text-stone-800 dark:text-stone-200 disabled:opacity-40 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors';

export function ReaderFooter({ currentIndex, total, percent, onPrev, onNext, onOpenOutline }: ReaderFooterProps) {
  return (
    <footer className="reader-chrome sticky bottom-0 z-(--z-sticky) backdrop-blur-md border-t px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <button onClick={onPrev} disabled={currentIndex === 0} aria-keyshortcuts="[" className={navBtn}>
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          <span>
            Previous<span className="hidden sm:inline"> chapter</span>
          </span>
        </button>

        <button
          onClick={onOpenOutline}
          className="text-center text-xs text-stone-700 dark:text-stone-300 hidden sm:inline-flex px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          {currentIndex + 1} of {total} chapters · {percent}% complete
        </button>

        <button onClick={onNext} disabled={currentIndex === total - 1} aria-keyshortcuts="]" className={navBtn}>
          <span>
            Next<span className="hidden sm:inline"> chapter</span>
          </span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </footer>
  );
}
