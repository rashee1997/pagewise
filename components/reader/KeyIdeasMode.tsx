'use client';

import React, { useState, useEffect } from 'react';
import { useAbortableRequest, isAbortError } from '@/hooks/reader/useAbortableRequest';
import { Book, Chapter, KeyIdea, AppSettings } from '@/lib/db/types';
import { getChapterMaterial, saveChapterMaterial, saveGenerationRecord } from '@/lib/db';
import { Sparkles, RefreshCw, Lightbulb, Quote, Compass, AlertCircle } from 'lucide-react';

interface KeyIdeasModeProps {
  book: Book;
  chapter: Chapter;
  settings: AppSettings;
}

export function KeyIdeasMode({ book, chapter, settings }: KeyIdeasModeProps) {
  const [ideas, setIdeas] = useState<KeyIdea[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSaved() {
      const saved = await getChapterMaterial<KeyIdea[]>(chapter.id, 'keyIdeas');
      if (isMounted && saved) {
        setIdeas(saved);
      } else if (isMounted) {
        setIdeas(null);
      }
    }
    loadSaved();
    return () => {
      isMounted = false;
    };
  }, [chapter.id]);

  const nextSignal = useAbortableRequest();
  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    const signal = nextSignal();
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'keyIdeas',
          chapterText: chapter.text,
          bookTitle: book.title,
          author: book.author,
          chapterTitle: chapter.title,
          provider: settings.provider,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to extract key ideas.');
      }

      if (json.data && Array.isArray(json.data)) {
        const payload: KeyIdea[] = json.data;
        setIdeas(payload);
        await saveChapterMaterial(book.id, chapter.id, 'keyIdeas', payload);
        await saveGenerationRecord({
          id: `rec_${chapter.id}_ideas_${Date.now()}`,
          bookId: book.id,
          chapterId: chapter.id,
          kind: 'keyIdeas',
          inputHash: chapter.textHash,
          promptVersion: '1.0',
          batch: 1,
          createdAt: Date.now(),
        });
      } else {
        throw new Error('Could not parse ideas array from model.');
      }
    } catch (err: any) {
      if (isAbortError(err)) return;
      console.error('Error generating key ideas:', err);
      setError(err?.message || 'Failed to extract key ideas.');
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Key Ideas & Mental Models
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            {chapter.title}
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Extracting Models...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{ideas ? 'Regenerate Ideas' : 'Extract Key Ideas'}</span>
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

      {isLoading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-stone-100 dark:bg-stone-800 rounded-2xl p-6" />
          ))}
        </div>
      )}

      {!isLoading && ideas && (
        <div className="grid gap-5">
          {ideas.map((idea, idx) => (
            <div
              key={idx}
              className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xs space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {idx + 1}
                </div>
                <h3 className="text-base md:text-lg font-bold text-stone-900 dark:text-stone-100">
                  {idea.title}
                </h3>
              </div>

              <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                {idea.explanation}
              </p>

              {idea.quote && (
                <div className="p-3.5 bg-stone-50 dark:bg-stone-950 rounded-xl border-l-2 border-stone-400 dark:border-stone-600 text-xs italic font-serif text-stone-600 dark:text-stone-400">
                  &ldquo;{idea.quote}&rdquo;
                </div>
              )}

              {idea.actionableInsight && (
                <div className="flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900">
                  <Compass className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-400" />
                  <div>
                    <span className="font-semibold block mb-0.5">Practical Application:</span>
                    <span>{idea.actionableInsight}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && !ideas && !error && (
        <div className="py-16 text-center space-y-3 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 p-8">
          <Lightbulb className="w-8 h-8 text-stone-600 dark:text-stone-400 mx-auto" />
          <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
            No key ideas extracted yet
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto">
            Extract the timeless principles and mental models from this chapter.
          </p>
        </div>
      )}
    </div>
  );
}
