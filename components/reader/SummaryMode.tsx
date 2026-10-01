'use client';

import React, { useState, useEffect } from 'react';
import { Book, Chapter, ChapterSummary, AppSettings } from '@/lib/db/types';
import { getChapterMaterial, saveChapterMaterial, saveGenerationRecord } from '@/lib/db';
import { Sparkles, RefreshCw, CheckCircle2, ListOrdered, BookOpen, AlertCircle } from 'lucide-react';

interface SummaryModeProps {
  book: Book;
  chapter: Chapter;
  settings: AppSettings;
}

export function SummaryMode({ book, chapter, settings }: SummaryModeProps) {
  const [summary, setSummary] = useState<ChapterSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSaved() {
      const saved = await getChapterMaterial<ChapterSummary>(chapter.id, 'summary');
      if (isMounted && saved) {
        setSummary(saved);
      } else if (isMounted) {
        setSummary(null);
      }
    }
    loadSaved();
    return () => {
      isMounted = false;
    };
  }, [chapter.id]);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'summary',
          chapterText: chapter.text,
          bookTitle: book.title,
          author: book.author,
          chapterTitle: chapter.title,
          provider: settings.provider,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to generate summary.');
      }

      if (json.data) {
        const payload: ChapterSummary = json.data;
        setSummary(payload);
        await saveChapterMaterial(book.id, chapter.id, 'summary', payload);
        await saveGenerationRecord({
          id: `rec_${chapter.id}_summary_${Date.now()}`,
          bookId: book.id,
          chapterId: chapter.id,
          kind: 'summary',
          inputHash: chapter.textHash,
          promptVersion: '1.0',
          batch: 1,
          createdAt: Date.now(),
        });
      } else {
        throw new Error('Could not parse summary data from model.');
      }
    } catch (err: any) {
      console.error('Error generating summary:', err);
      setError(err?.message || 'Failed to generate summary. Please check your AI connection in Settings.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-8 animate-in fade-in duration-200">
      {/* Top Banner & Generation Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Chapter Summary
          </h2>
          <p className="text-xs text-stone-500">
            {chapter.title} · {chapter.tokenEstimate} tokens
          </p>
        </div>

        <button
          onClick={handleGenerateSummary}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing Chapter...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{summary ? 'Regenerate Summary' : 'Generate Summary'}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Skeletons while loading */}
      {isLoading && (
        <div className="space-y-6 animate-pulse">
          <div className="h-6 bg-stone-200 dark:bg-stone-800 rounded-md w-3/4" />
          <div className="space-y-2">
            <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded-sm w-full" />
            <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded-sm w-5/6" />
            <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded-sm w-4/6" />
          </div>
          <div className="h-32 bg-stone-100 dark:bg-stone-800/60 rounded-xl" />
        </div>
      )}

      {/* Render Summary Content */}
      {!isLoading && summary && (
        <div className="space-y-8">
          {/* Executive Headline */}
          {summary.headline && (
            <div className="p-5 bg-stone-100/80 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-800">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Core Thesis
              </span>
              <p className="text-lg md:text-xl font-serif font-medium text-stone-900 dark:text-stone-100 leading-snug">
                {summary.headline}
              </p>
            </div>
          )}

          {/* Detailed Overview */}
          {summary.overview && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Executive Overview
              </h3>
              <p className="text-sm md:text-base text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-line">
                {summary.overview}
              </p>
            </div>
          )}

          {/* Key Takeaways */}
          {summary.takeaways && summary.takeaways.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Key Takeaways
              </h3>
              <div className="grid gap-2.5">
                {summary.takeaways.map((point, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl flex items-start gap-3 shadow-2xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-stone-800 dark:text-stone-200">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Outline */}
          {summary.outline && summary.outline.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-2">
                <ListOrdered className="w-4 h-4" />
                <span>Chapter Progression</span>
              </h3>
              <div className="space-y-2 border-l-2 border-stone-200 dark:border-stone-800 pl-4 ml-2">
                {summary.outline.map((item, idx) => (
                  <div key={idx} className="relative pb-3 last:pb-0">
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                      {item.title}
                    </span>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                      {item.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State before Generation */}
      {!isLoading && !summary && !error && (
        <div className="py-16 text-center space-y-3 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 p-8">
          <BookOpen className="w-8 h-8 text-stone-400 mx-auto" />
          <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
            No summary generated for this chapter yet
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Click the button above to distill this chapter into key takeaways, outline, and core thesis.
          </p>
        </div>
      )}
    </div>
  );
}
