'use client';

import React, { useState, useEffect } from 'react';
import { Book, Chapter, GlossaryItem, AppSettings } from '@/lib/db/types';
import { getChapterMaterial, saveChapterMaterial, saveGenerationRecord } from '@/lib/db';
import { Sparkles, RefreshCw, BookMarked, AlertCircle } from 'lucide-react';

interface GlossaryModeProps {
  book: Book;
  chapter: Chapter;
  settings: AppSettings;
}

export function GlossaryMode({ book, chapter, settings }: GlossaryModeProps) {
  const [glossary, setGlossary] = useState<GlossaryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSaved() {
      const saved = await getChapterMaterial<GlossaryItem[]>(chapter.id, 'glossary');
      if (isMounted && saved) {
        setGlossary(saved);
      } else if (isMounted) {
        setGlossary(null);
      }
    }
    loadSaved();
    return () => {
      isMounted = false;
    };
  }, [chapter.id]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'glossary',
          chapterText: chapter.text,
          bookTitle: book.title,
          author: book.author,
          chapterTitle: chapter.title,
          provider: settings.provider,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to extract glossary.');
      }

      if (json.data && Array.isArray(json.data)) {
        const payload: GlossaryItem[] = json.data;
        setGlossary(payload);
        await saveChapterMaterial(book.id, chapter.id, 'glossary', payload);
        await saveGenerationRecord({
          id: `rec_${chapter.id}_glossary_${Date.now()}`,
          bookId: book.id,
          chapterId: chapter.id,
          kind: 'glossary',
          inputHash: chapter.textHash,
          promptVersion: '1.0',
          batch: 1,
          createdAt: Date.now(),
        });
      } else {
        throw new Error('Could not parse glossary array from model.');
      }
    } catch (err: any) {
      console.error('Error generating glossary:', err);
      setError(err?.message || 'Failed to extract glossary.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Terminology & Glossary
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Vocabulary and specialized concepts for {chapter.title}
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
              <span>Extracting Terminology...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{glossary ? 'Regenerate Glossary' : 'Extract Glossary'}</span>
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
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-stone-100 dark:bg-stone-800 rounded-xl p-4" />
          ))}
        </div>
      )}

      {!isLoading && glossary && (
        <div className="grid gap-3">
          {glossary.map((item, idx) => (
            <div
              key={idx}
              className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xs space-y-1.5"
            >
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {item.term}
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                {item.definition}
              </p>
              {item.contextUsage && (
                <p className="text-xs text-stone-600 dark:text-stone-400 italic">
                  Context: &ldquo;{item.contextUsage}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && !glossary && !error && (
        <div className="py-16 text-center space-y-3 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 p-8">
          <BookMarked className="w-8 h-8 text-stone-600 dark:text-stone-400 mx-auto" />
          <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
            No glossary extracted yet
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto">
            Extract domain terms, technical phrases, and archaic vocabulary defined in context.
          </p>
        </div>
      )}
    </div>
  );
}
