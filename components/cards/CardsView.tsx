'use client';

import React, { useState, useEffect } from 'react';
import { FlashCard, Book } from '@/lib/db/types';
import { getAllCards, getDueCards } from '@/lib/db';
import { ReviewSession } from './ReviewSession';
import { CardBrowser } from './CardBrowser';
import { Layers, Play, CheckCircle2, BookOpen, Clock, Calendar } from 'lucide-react';

interface CardsViewProps {
  books: Book[];
  onOpenBook: (bookId: string) => void;
}

export function CardsView({ books, onOpenBook }: CardsViewProps) {
  const [activeTab, setActiveTab] = useState<'review' | 'browse'>('review');
  const [allCards, setAllCards] = useState<FlashCard[]>([]);
  const [dueCards, setDueCards] = useState<FlashCard[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [filterBookId, setFilterBookId] = useState<string | null>(null);

  const loadCardData = React.useCallback(async () => {
    const all = await getAllCards();
    const due = await getDueCards();
    setAllCards(all);
    setDueCards(due);
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const all = await getAllCards();
      const due = await getDueCards();
      if (!ignore) {
        setAllCards(all);
        setDueCards(due);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const handleStartReview = (bookId?: string) => {
    setFilterBookId(bookId || null);
    setIsReviewing(true);
  };

  const handleFinishReview = async () => {
    setIsReviewing(false);
    await loadCardData();
  };

  const cardsToReview = filterBookId
    ? dueCards.filter(c => c.bookId === filterBookId)
    : dueCards;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Active Review Flow modal */}
      {isReviewing && cardsToReview.length > 0 && (
        <ReviewSession
          cards={cardsToReview}
          onComplete={handleFinishReview}
          onExit={() => setIsReviewing(false)}
        />
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Spaced Repetition
          </h1>
          <p className="text-xs md:text-sm text-stone-500">
            FSRS memory scheduling · Never forget what you read
          </p>
        </div>

        {/* View Segmented Switch */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('review')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'review'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            Review Hub
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'browse'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            Browse Cards ({allCards.length})
          </button>
        </div>
      </div>

      {activeTab === 'review' ? (
        <div className="space-y-6">
          {/* Big Action Card: Due Recall */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Daily Recall Target</span>
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-stone-950 dark:text-stone-50">
                {dueCards.length} {dueCards.length === 1 ? 'Card' : 'Cards'} Due Today
              </h2>

              <p className="text-sm text-stone-600 dark:text-stone-300">
                {dueCards.length > 0
                  ? 'Review these cards to strengthen retention right before memory decay sets in.'
                  : 'All caught up! You have reviewed all scheduled cards for now.'}
              </p>
            </div>

            {dueCards.length > 0 ? (
              <button
                onClick={() => handleStartReview()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 font-semibold text-sm rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Review Session</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero Due Cards</span>
              </div>
            )}
          </div>

          {/* Decks by Book */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              Decks by Book
            </h3>

            {books.length > 0 ? (
              <div className="grid gap-3">
                {books.map(b => {
                  const bookCards = allCards.filter(c => c.bookId === b.id);
                  const bookDue = dueCards.filter(c => c.bookId === b.id);

                  return (
                    <div
                      key={b.id}
                      className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl flex items-center justify-between shadow-2xs hover:border-stone-300 dark:hover:border-stone-700 transition-colors"
                    >
                      <div className="space-y-1 min-w-0 pr-4">
                        <h4 className="font-semibold text-sm md:text-base text-stone-900 dark:text-stone-100 truncate">
                          {b.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                          <span>{bookCards.length} total cards</span>
                          <span aria-hidden="true">·</span>
                          <span className={bookDue.length > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                            {bookDue.length} due
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {bookDue.length > 0 ? (
                          <button
                            onClick={() => handleStartReview(b.id)}
                            className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Review ({bookDue.length})
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenBook(b.id)}
                            className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium rounded-lg transition-colors"
                          >
                            Read Book
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-stone-500">
                Upload a book to create your first study deck.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Browse and Edit Cards Tab */
        <CardBrowser
          cards={allCards}
          books={books}
          onRefreshCards={loadCardData}
        />
      )}
    </div>
  );
}
