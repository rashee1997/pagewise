'use client';

import React, { useState, useEffect } from 'react';
import { Book, Chapter, FlashCard, AppSettings } from '@/lib/db/types';
import { getAllCards, saveCards, deleteCard, saveGenerationRecord } from '@/lib/db';
import { filterDuplicateCards, generateFingerprint } from '@/lib/study/dedupe';
import { createInitialFsrsState } from '@/lib/study/fsrs';
import { Sparkles, RefreshCw, Layers, Plus, Trash2, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';

interface CardsModeProps {
  book: Book;
  chapter: Chapter;
  settings: AppSettings;
}

export function CardsMode({ book, chapter, settings }: CardsModeProps) {
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [batchCount, setBatchCount] = useState(1);

  const loadCards = React.useCallback(async () => {
    const list = await getAllCards(book.id, chapter.id);
    setCards(list);
  }, [book.id, chapter.id]);

  useEffect(() => {
    let ignore = false;
    getAllCards(book.id, chapter.id).then(list => {
      if (!ignore) setCards(list);
    });
    return () => {
      ignore = true;
    };
  }, [book.id, chapter.id]);

  const handleGenerateCards = async () => {
    setIsLoading(true);
    setError(null);
    setNotice(null);

    try {
      const existingConceptKeys = cards.map(c => c.conceptKey).filter(Boolean);

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'cards',
          chapterText: chapter.text,
          bookTitle: book.title,
          author: book.author,
          chapterTitle: chapter.title,
          existingConceptKeys,
          provider: settings.provider,
          batch: batchCount,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to generate flashcards.');
      }

      if (json.data && Array.isArray(json.data)) {
        const rawCandidates = json.data.map((c: any) => ({
          bookId: book.id,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          type: (c.type === 'concept' || c.type === 'cloze' ? c.type : 'basic') as any,
          front: c.front || '',
          back: c.back || '',
          hint: c.hint || '',
          conceptKey: c.conceptKey || `concept-${Date.now()}`,
          fingerprint: generateFingerprint(c.front || ''),
        }));

        // Deduplicate against existing cards
        const dedupeResult = filterDuplicateCards(rawCandidates, cards);

        const newFlashCards: FlashCard[] = dedupeResult.accepted.map(c => ({
          ...c,
          id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          fsrs: createInitialFsrsState(),
          createdAt: Date.now(),
        }));

        if (newFlashCards.length > 0) {
          await saveCards(newFlashCards);
          await saveGenerationRecord({
            id: `rec_${chapter.id}_cards_b${batchCount}_${Date.now()}`,
            bookId: book.id,
            chapterId: chapter.id,
            kind: 'cards',
            inputHash: chapter.textHash,
            promptVersion: '1.0',
            batch: batchCount,
            createdAt: Date.now(),
          });
          setBatchCount(b => b + 1);
        }

        if (dedupeResult.skippedCount > 0) {
          setNotice(`Added ${newFlashCards.length} new flashcards (${dedupeResult.skippedCount} duplicates filtered out).`);
        } else {
          setNotice(`Added ${newFlashCards.length} new flashcards.`);
        }

        await loadCards();
      } else {
        throw new Error('Could not parse cards array from model response.');
      }
    } catch (err: any) {
      console.error('Error generating cards:', err);
      setError(err?.message || 'Failed to generate cards.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (cardId: string) => {
    await deleteCard(cardId);
    await loadCards();
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Chapter Flashcards ({cards.length})
          </h2>
          <p className="text-xs text-stone-500">
            Spaced repetition memory cards for {chapter.title}
          </p>
        </div>

        <button
          onClick={handleGenerateCards}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Generating Deduplicated Cards...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{cards.length > 0 ? 'Generate More Cards (+Batch)' : 'Generate Flashcards'}</span>
            </>
          )}
        </button>
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && (
        <div className="grid gap-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-stone-100 dark:bg-stone-800 rounded-2xl p-5" />
          ))}
        </div>
      )}

      {!isLoading && cards.length > 0 && (
        <div className="grid gap-4">
          {cards.map((c, idx) => (
            <div
              key={c.id}
              className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xs space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  <span className="capitalize">{c.type}</span>
                  <span aria-hidden="true">·</span>
                  <span>{c.conceptKey}</span>
                </div>

                <button
                  onClick={() => handleDelete(c.id)}
                  title="Delete card"
                  className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Front Question */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                  Question / Prompt
                </span>
                <p className="text-sm md:text-base font-semibold text-stone-900 dark:text-stone-100">
                  {c.front}
                </p>
              </div>

              {/* Back Answer */}
              <div className="space-y-1 pt-2 border-t border-stone-100 dark:border-stone-800/80">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                  Recall Target
                </span>
                <p className="text-xs md:text-sm text-stone-700 dark:text-stone-300 whitespace-pre-line leading-relaxed">
                  {c.back}
                </p>
              </div>

              {c.hint && (
                <div className="text-[11px] text-stone-500 italic bg-stone-50 dark:bg-stone-950 p-2 rounded-lg">
                  Hint: {c.hint}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && cards.length === 0 && !error && (
        <div className="py-16 text-center space-y-3 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 p-8">
          <Layers className="w-8 h-8 text-stone-400 mx-auto" />
          <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
            No cards created for this chapter yet
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Generate flashcards to commit this chapter’s core arguments to long-term memory via spaced repetition.
          </p>
        </div>
      )}
    </div>
  );
}
