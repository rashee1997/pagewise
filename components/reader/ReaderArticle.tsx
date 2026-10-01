'use client';

import React, { forwardRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppSettings, Chapter, Note } from '@/lib/db/types';
import { renderParagraph } from './renderParagraph';

interface ReaderArticleProps {
  chapter: Chapter;
  chapterIndex: number;
  chapterCount: number;
  paragraphs: string[];
  notes: Note[];
  settings: AppSettings;
  onPrev: () => void;
  onNext: () => void;
}

const SIZE_CLASSES = {
  sm: 'text-sm leading-relaxed',
  md: 'text-base md:text-[17px] leading-relaxed md:leading-loose',
  lg: 'text-lg md:text-xl leading-relaxed md:leading-loose',
  xl: 'text-xl md:text-2xl leading-loose',
};

const WIDTH_CLASSES = { narrow: 'max-w-[55ch]', normal: 'max-w-[68ch]', wide: 'max-w-[80ch]' };

/** The "Read" mode article: chapter header, paragraphs with saved highlights, and prev/next controls. */
export const ReaderArticle = forwardRef<HTMLDivElement, ReaderArticleProps>(function ReaderArticle(
  { chapter, chapterIndex, chapterCount, paragraphs, notes, settings, onPrev, onNext },
  ref
) {
  const isSerif = settings.readerFontFamily === 'serif';

  return (
    <div
      ref={ref}
      className={`${WIDTH_CLASSES[settings.readerLineWidth || 'normal']} mx-auto space-y-8 animate-in fade-in duration-200`}
    >
      <div className="pb-8 border-b border-current/15 space-y-3 text-center sm:text-left">
        <p className="text-xs uppercase tracking-widest font-semibold opacity-75">
          Chapter {chapterIndex + 1} of {chapterCount} · Pages {chapter.startPage}–{chapter.endPage}
        </p>
        <h2 className="text-3xl md:text-4xl font-bold font-serif tracking-tight leading-tight">{chapter.title}</h2>
      </div>

      <div className={`${isSerif ? 'font-serif' : 'font-sans'} ${SIZE_CLASSES[settings.readerFontSize || 'md']}`}>
        {paragraphs.map((para, idx) => (
          <p
            key={idx}
            className={`mb-6 leading-relaxed ${
              idx === 0 && isSerif && /^[A-Z]/.test(para)
                ? 'first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:leading-none'
                : ''
            }`}
          >
            {renderParagraph(para, notes)}
          </p>
        ))}
      </div>

      <div className="pt-12 pb-20 flex items-center justify-between gap-3 border-t border-current/15">
        <button
          onClick={onPrev}
          disabled={chapterIndex === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-11 rounded-xl text-xs font-semibold bg-stone-100 text-stone-900 dark:bg-stone-900 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          <span>Previous</span>
        </button>
        <span className="text-xs opacity-75 font-medium text-center">
          Chapter {chapterIndex + 1} of {chapterCount}
        </span>
        <button
          onClick={onNext}
          disabled={chapterIndex === chapterCount - 1}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-11 rounded-xl text-xs font-semibold bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
});
