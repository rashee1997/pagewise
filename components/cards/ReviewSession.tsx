'use client';

import React, { useState, useEffect } from 'react';
import { FlashCard } from '@/lib/db/types';
import { calculateNextState, previewNextIntervals } from '@/lib/study/fsrs';
import { updateCardReview } from '@/lib/db';
import { X, HelpCircle, Check, Award, ArrowRight, RotateCw, RotateCcw, BookOpen, Quote } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Dialog } from '@/components/ui/Dialog';
import { FsrsState } from '@/lib/db/types';

interface ReviewSessionProps {
  cards: FlashCard[];
  onComplete: () => void;
  onExit: () => void;
}

export function ReviewSession({ cards, onComplete, onExit }: ReviewSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [history, setHistory] = useState<Array<{ card: FlashCard; prevFsrs: FsrsState; rating: 1 | 2 | 3 | 4 }>>([]);
  const shownAtRef = React.useRef(0);

  const currentCard = cards[currentIndex];
  const isFinished = currentIndex >= cards.length;

  const handleRate = React.useCallback(async (rating: 1 | 2 | 3 | 4) => {
    if (!currentCard) return;

    const prevFsrs = { ...currentCard.fsrs };
    const { nextState } = calculateNextState(currentCard.fsrs, rating);
    const elapsed = Math.min(60000, Math.max(0, Date.now() - shownAtRef.current));
    await updateCardReview(currentCard.id, nextState, rating, elapsed);

    setHistory(prev => [...prev, { card: currentCard, prevFsrs, rating }]);
    setReviewedCount(c => c + 1);
    setShowAnswer(false);
    setShowHint(false);
    setCurrentIndex(i => i + 1);
  }, [currentCard]);

  // Restart the response timer whenever a new card appears
  useEffect(() => {
    shownAtRef.current = Date.now();
  }, [currentIndex]);

  const handleUndo = React.useCallback(async () => {
    if (history.length === 0 || currentIndex === 0) return;
    const lastItem = history[history.length - 1];
    await updateCardReview(lastItem.card.id, lastItem.prevFsrs, 3, 0);

    setHistory(prev => prev.slice(0, -1));
    setReviewedCount(c => Math.max(0, c - 1));
    setCurrentIndex(i => Math.max(0, i - 1));
    setShowAnswer(false);
    setShowHint(false);
  }, [history, currentIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished || e.metaKey || e.ctrlKey || e.altKey) return;
      // Don't hijack typing or native button activation
      const t = e.target as HTMLElement | null;
      if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)) return;
      if (t && t.tagName === 'BUTTON' && (e.code === 'Space' || e.key === 'Enter')) return;

      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setShowAnswer(prev => !prev);
      } else if (showAnswer) {
        if (e.key === '1') handleRate(1);
        else if (e.key === '2') handleRate(2);
        else if (e.key === '3') handleRate(3);
        else if (e.key === '4') handleRate(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, isFinished, handleRate, handleUndo]);

  // Trigger celebration on finish
  useEffect(() => {
    if (isFinished && reviewedCount > 0) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          disableForReducedMotion: true,
        });
      } catch (e) {
        // Ignore in headless
      }
    }
  }, [isFinished, reviewedCount]);

  if (isFinished || !currentCard) {
    const total = history.length;
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<number, number>;
    history.forEach(h => (counts[h.rating] += 1));
    const retention = total ? Math.round(((counts[3] + counts[4]) / total) * 100) : 0;
    const hardest = history.filter(h => h.rating === 1).slice(0, 3);
    return (
      <Dialog
        isOpen
        onClose={onComplete}
        title="Session complete"
        panelClassName="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white dark:bg-stone-900 rounded-3xl p-8 border border-stone-200 dark:border-stone-800 text-center space-y-6 shadow-2xl animate-in zoom-in-95"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto" aria-hidden="true">
          <Award className="w-8 h-8" />
        </div>

        <p className="text-sm text-stone-600 dark:text-stone-400">
          You reviewed {reviewedCount} {reviewedCount === 1 ? 'card' : 'cards'}. Intervals have been rescheduled.
        </p>

        {total > 0 && (
          <>
            <dl className="grid grid-cols-4 gap-2 text-center">
              {([['Again', 1], ['Hard', 2], ['Good', 3], ['Easy', 4]] as const).map(([label, r]) => (
                <div key={label} className="rounded-xl bg-stone-100 dark:bg-stone-800 py-2">
                  <dd className="text-lg font-bold tabular-nums text-stone-900 dark:text-stone-100">{counts[r]}</dd>
                  <dt className="text-xs text-stone-600 dark:text-stone-400">{label}</dt>
                </div>
              ))}
            </dl>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{retention}% recalled (Good or Easy)</p>
          </>
        )}

        {hardest.length > 0 && (
          <div className="text-left space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">Needs another look</h3>
            <ul className="space-y-1 text-sm text-stone-800 dark:text-stone-200 list-disc pl-5">
              {hardest.map(h => (
                <li key={h.card.id} className="line-clamp-2">{h.card.front}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          data-autofocus
          onClick={onComplete}
          className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 font-semibold text-sm rounded-xl transition-colors shadow-xs"
        >
          Return to study hub
        </button>
      </Dialog>
    );
  }

  const intervalPreviews = previewNextIntervals(currentCard.fsrs);

  return (
    <Dialog
      isOpen
      onClose={onExit}
      title="Flashcard review"
      hideTitle
      panelClassName="fixed inset-0 bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between p-4 md:p-8 select-none overflow-y-auto"
    >
      {/* Top Header */}
      <div className="max-w-2xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">
            Card {currentIndex + 1} of {cards.length}
          </span>
          {/* Progress pill */}
          <div
            role="progressbar"
            aria-label="Review progress"
            aria-valuemin={0}
            aria-valuemax={cards.length}
            aria-valuenow={currentIndex}
            className="w-24 bg-stone-200 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden"
          >
            <div
              className="bg-stone-900 dark:bg-stone-100 h-full w-full origin-left rounded-full transition-transform duration-200"
              style={{ transform: `scaleX(${(currentIndex + 1) / cards.length})` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={handleUndo}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
              title="Undo last rating (Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          )}

          <button
            onClick={onExit}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-900 transition-colors cursor-pointer"
            title="Exit review"
            aria-label="Exit review"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Flashcard Card Container */}
      <div className="max-w-2xl w-full mx-auto my-auto py-6">
        <div
          onClick={() => {
            if (!showAnswer) setShowAnswer(true);
          }}
          aria-live="polite"
          className={`min-h-80 md:min-h-96 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 shadow-md flex flex-col justify-between transition-all ${
            !showAnswer ? 'cursor-pointer hover:border-stone-400 dark:hover:border-stone-700' : ''
          }`}
        >
          {/* Card Top: Concept Tag & Chapter */}
          <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 font-medium">
            <span className="capitalize">{currentCard.chapterTitle || 'Chapter Card'}</span>
            <span className="text-stone-600 dark:text-stone-400">{currentCard.conceptKey}</span>
          </div>

          {/* Front Question */}
          <div className="my-auto py-6 space-y-4">
            <p className="text-xl md:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 leading-snug">
              {currentCard.front}
            </p>

            {/* Hint toggle if available */}
            {currentCard.hint && (
              <div>
                {!showHint ? (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowHint(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Show hint</span>
                  </button>
                ) : (
                  <div className="text-xs italic text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800">
                    Hint: {currentCard.hint}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Back Target (Answer) */}
          {showAnswer ? (
            <div className="pt-6 border-t border-stone-100 dark:border-stone-800 animate-in fade-in duration-150 space-y-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 block mb-1">
                  Answer & Key Reasoning
                </span>
                <p className="text-base md:text-lg text-stone-800 dark:text-stone-200 whitespace-pre-line leading-relaxed">
                  {currentCard.back}
                </p>
              </div>

              {/* Source Passage Anchor (RemNote-style context link) */}
              {currentCard.sourceAnchor?.quoteSnippet && (
                <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-700/80 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-300">
                    <Quote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Original Source ({currentCard.chapterTitle || 'Chapter'})</span>
                  </div>
                  <p className="text-xs italic text-stone-600 dark:text-stone-300 line-clamp-3">
                    &ldquo;{currentCard.sourceAnchor.quoteSnippet}&rdquo;
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-xs text-stone-600 dark:text-stone-400 pt-4 border-t border-stone-100 dark:border-stone-800/80">
              Tap card or press <kbd className="px-1.5 py-0.5 font-mono bg-stone-100 dark:bg-stone-800 rounded">Space</kbd> to reveal answer
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls / 4 Rating Buttons */}
      <div className="max-w-2xl w-full mx-auto">
        {!showAnswer ? (
          <button
            onClick={() => setShowAnswer(true)}
            className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 font-semibold text-sm rounded-2xl transition-all shadow-xs cursor-pointer"
          >
            Show Answer
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2 md:gap-3">
            {/* 1: Again */}
            <button
              onClick={() => handleRate(1)}
              className="py-3 px-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group"
            >
              <span className="text-xs md:text-sm font-bold text-red-700 dark:text-red-300">
                Again
              </span>
              <span className="text-xs text-red-500">
                {intervalPreviews[1]} <span className="text-xs opacity-60">(1)</span>
              </span>
            </button>

            {/* 2: Hard */}
            <button
              onClick={() => handleRate(2)}
              className="py-3 px-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-900 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group"
            >
              <span className="text-xs md:text-sm font-bold text-amber-700 dark:text-amber-300">
                Hard
              </span>
              <span className="text-xs text-amber-800 dark:text-amber-400">
                {intervalPreviews[2]} <span className="text-xs opacity-60">(2)</span>
              </span>
            </button>

            {/* 3: Good */}
            <button
              onClick={() => handleRate(3)}
              className="py-3 px-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-900 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group"
            >
              <span className="text-xs md:text-sm font-bold text-blue-700 dark:text-blue-300">
                Good
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400">
                {intervalPreviews[3]} <span className="text-xs opacity-60">(3)</span>
              </span>
            </button>

            {/* 4: Easy */}
            <button
              onClick={() => handleRate(4)}
              className="py-3 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group"
            >
              <span className="text-xs md:text-sm font-bold text-emerald-700 dark:text-emerald-300">
                Easy
              </span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400">
                {intervalPreviews[4]} <span className="text-xs opacity-60">(4)</span>
              </span>
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
