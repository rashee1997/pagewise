'use client';

import React, { useState, useEffect } from 'react';
import { Book, AppSettings } from '@/lib/db/types';
import { Flame, Layers, Clock, ArrowRight, BookOpen, Sparkles, RefreshCw, Plus, CheckCircle2, TrendingUp } from 'lucide-react';
import { getLast7DaysActivity, DayReadingSummary } from '@/lib/habit/streak';

interface TodayViewProps {
  books: Book[];
  dueCardsCount: number;
  todayMinutes: number;
  settings: AppSettings;
  onOpenBook: (bookId: string) => void;
  onStartReview: () => void;
  onOpenUpload: () => void;
}

const DEFAULT_MOTIVATIONS = [
  {
    text: 'A reader lives a thousand lives before he dies. The man who never reads lives only one.',
    author: 'George R.R. Martin',
  },
  {
    text: 'Reading is to the mind what exercise is to the body.',
    author: 'Joseph Addison',
  },
  {
    text: 'The more that you read, the more things you will know. The more that you learn, the more places you will go.',
    author: 'Dr. Seuss',
  },
  {
    text: 'Think before you speak. Read before you think.',
    author: 'Fran Lebowitz',
  },
  {
    text: 'In the case of good books, the point is not to see how many of them you can get through, but rather how many can get through to you.',
    author: 'Mortimer J. Adler',
  },
];

export function TodayView({
  books,
  dueCardsCount,
  todayMinutes,
  settings,
  onOpenBook,
  onStartReview,
  onOpenUpload,
}: TodayViewProps) {
  // Motivation quote state
  const [motivationIndex, setMotivationIndex] = useState(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return Math.abs(dayOfYear) % DEFAULT_MOTIVATIONS.length;
  });
  const [isRefreshingQuote, setIsRefreshingQuote] = useState(false);

  const handleNextQuote = () => {
    setIsRefreshingQuote(true);
    setTimeout(() => {
      setMotivationIndex(prev => (prev + 1) % DEFAULT_MOTIVATIONS.length);
      setIsRefreshingQuote(false);
    }, 200);
  };

  // Find most recent active book
  const activeBook = books.length > 0 ? books[0] : null;
  const goalMinutes = settings.dailyGoalMinutes || 20;
  const goalPercent = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));
  const minutesLeft = Math.max(0, goalMinutes - todayMinutes);

  const [weeklyActivity, setWeeklyActivity] = useState<DayReadingSummary[]>([]);

  useEffect(() => {
    let ignore = false;
    getLast7DaysActivity(goalMinutes).then(data => {
      if (!ignore) setWeeklyActivity(data);
    });
    return () => {
      ignore = true;
    };
  }, [goalMinutes, todayMinutes]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8 animate-in fade-in duration-200">
      {/* 1. Daily Motivation Quote (Calm, unboxed) */}
      <section className="relative px-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-base md:text-lg font-serif italic text-stone-700 dark:text-stone-300 leading-relaxed">
              &ldquo;{DEFAULT_MOTIVATIONS[motivationIndex].text}&rdquo;
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500 font-medium">
              — {DEFAULT_MOTIVATIONS[motivationIndex].author}
            </p>
          </div>
          <button
            onClick={handleNextQuote}
            title="Next quote"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingQuote ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>

      {/* 2. Main Action Card: Continue Reading */}
      {activeBook ? (
        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 md:p-8 shadow-xs relative overflow-hidden group">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-lg">
              <div className="flex items-center gap-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                <BookOpen className="w-4 h-4 text-stone-400" />
                <span>Continue Reading</span>
                <span aria-hidden="true">·</span>
                <span>{activeBook.progress.percent}% Completed</span>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-950 dark:text-stone-50">
                {activeBook.title}
              </h2>

              <p className="text-sm text-stone-600 dark:text-stone-300">
                {activeBook.author && <span>by {activeBook.author} · </span>}
                <span>
                  Chapter {(activeBook.progress.chapterIndex ?? 0) + 1}
                  {minutesLeft > 0 ? ` · ${minutesLeft} min left to hit today’s goal` : ' · Daily goal achieved!'}
                </span>
              </p>

              {/* Progress bar */}
              <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-stone-900 dark:bg-stone-100 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, activeBook.progress.percent)}%` }}
                />
              </div>
            </div>

            {/* Big Primary Button */}
            <button
              onClick={() => onOpenBook(activeBook.id)}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 font-semibold text-sm rounded-xl transition-all shadow-sm hover:shadow-md shrink-0 cursor-pointer"
            >
              <span>Resume Reader</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      ) : (
        /* Empty State */
        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              No book in your library yet
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto">
              Upload any PDF book or study notes to generate summaries, key ideas, and smart flashcards.
            </p>
          </div>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-sm font-medium rounded-xl shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add your first book</span>
          </button>
        </section>
      )}

      {/* 3. Daily Habit Indicators Row */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Streak */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {settings.streakDays} {settings.streakDays === 1 ? 'Day' : 'Days'}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              Reading Habit Streak
            </div>
          </div>
        </div>

        {/* Due Flashcards */}
        <div
          onClick={() => {
            if (dueCardsCount > 0) onStartReview();
          }}
          className={`bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center gap-3.5 shadow-2xs transition-colors ${
            dueCardsCount > 0 ? 'cursor-pointer hover:border-amber-400 dark:hover:border-amber-700' : ''
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center justify-between">
              <span>{dueCardsCount}</span>
              {dueCardsCount > 0 && (
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Review →</span>
              )}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              {dueCardsCount === 1 ? 'Card due for recall' : 'Cards due for recall'}
            </div>
          </div>
        </div>

        {/* Daily Goal */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {todayMinutes} / {goalMinutes} min
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              {goalPercent}% Daily Goal
            </div>
          </div>
        </div>
      </section>

      {/* 4. Weekly Reading Activity Mini-Chart (7 Days) */}
      {weeklyActivity.length > 0 && (
        <section className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Last 7 Days Reading Activity</span>
            </div>
            <span className="text-[11px] text-stone-400">Target: {goalMinutes}m / day</span>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-2 items-end h-24">
            {weeklyActivity.map((day, idx) => {
              const maxMinutes = Math.max(goalMinutes, ...weeklyActivity.map(d => d.minutes), 30);
              const heightPercent = Math.min(100, Math.round((day.minutes / maxMinutes) * 100));

              return (
                <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.minutes}m
                  </span>
                  <div className="w-full max-w-7 bg-stone-100 dark:bg-stone-800 rounded-lg h-14 flex items-end p-0.5 overflow-hidden">
                    <div
                      className={`w-full rounded-md transition-all ${
                        day.metGoal
                          ? 'bg-emerald-500'
                          : day.minutes > 0
                          ? 'bg-amber-400 dark:bg-amber-500'
                          : 'bg-transparent'
                      }`}
                      style={{ height: `${Math.max(day.minutes > 0 ? 15 : 0, heightPercent)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">
                    {day.dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. "10 Pages a Day" Starter Habit Loop */}
      <section className="bg-stone-50 dark:bg-stone-900/60 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
            The 10-Pages-a-Day Principle
          </span>
          <p className="text-xs text-stone-500 max-w-md">
            Reading just 10 pages every day adds up to 3,650 pages a year — equivalent to finishing 12 complete books.
          </p>
        </div>

        {activeBook && (
          <button
            onClick={() => onOpenBook(activeBook.id)}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 font-semibold text-xs rounded-xl shadow-2xs shrink-0 cursor-pointer"
          >
            Read 10 Pages Now
          </button>
        )}
      </section>

      {/* Quick Library Glance */}
      {books.length > 1 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              Other Books in Library
            </h3>
            <button
              onClick={() => onOpenBook(books[1].id)}
              className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            >
              View all ({books.length})
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {books.slice(1, 3).map(b => (
              <div
                key={b.id}
                onClick={() => onOpenBook(b.id)}
                className="p-3.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 transition-colors cursor-pointer flex items-center justify-between shadow-2xs"
              >
                <div className="min-w-0 pr-2">
                  <h4 className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                    {b.title}
                  </h4>
                  <p className="text-xs text-stone-500 truncate">
                    {b.author || `${b.chapterCount} chapters`} · {b.progress.percent}% done
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
