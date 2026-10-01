'use client';

import React, { useState, useEffect } from 'react';
import { Book, AppSettings } from '@/lib/db/types';
import { updateAppSettings } from '@/lib/db';
import { Flame, Layers, ArrowRight, BookOpen, Plus, CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import { getLast7DaysActivity, DayReadingSummary } from '@/lib/habit/streak';

interface TodayViewProps {
  books: Book[];
  dueCardsCount: number;
  todayMinutes: number;
  settings: AppSettings;
  onOpenBook: (bookId: string) => void;
  onStartReview: () => void;
  onOpenUpload: () => void;
  onOpenLibrary?: () => void;
  onUpdateSettings?: (newSettings: AppSettings) => void;
}

const CARD_SECONDS = 30;

export function TodayView({
  books,
  dueCardsCount,
  todayMinutes,
  settings,
  onOpenBook,
  onStartReview,
  onOpenUpload,
  onOpenLibrary,
  onUpdateSettings,
}: TodayViewProps) {
  // Books arrive ordered by last-opened, so the first is the one being read
  const activeBook = books.length > 0 ? books[0] : null;
  const goalMinutes = settings.dailyGoalMinutes || 20;
  const goalPercent = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));
  const minutesLeft = Math.max(0, goalMinutes - todayMinutes);
  const reviewMinutes = Math.max(1, Math.round((dueCardsCount * CARD_SECONDS) / 60));
  const goalMet = minutesLeft === 0;

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

  const chapterNumber = (activeBook?.progress.chapterIndex ?? 0) + 1;

  // One obvious next action
  const primary = dueCardsCount > 0
    ? { label: `Review ${dueCardsCount} ${dueCardsCount === 1 ? 'card' : 'cards'}`, run: onStartReview }
    : activeBook
    ? { label: 'Resume reading', run: () => onOpenBook(activeBook.id) }
    : { label: 'Add your first book', run: onOpenUpload };

  const planSteps = [
    {
      done: dueCardsCount === 0,
      title: dueCardsCount === 0 ? 'No cards due — you’re caught up' : `Review ${dueCardsCount} due ${dueCardsCount === 1 ? 'card' : 'cards'}`,
      detail: dueCardsCount === 0 ? undefined : `≈ ${reviewMinutes} min`,
      action: dueCardsCount > 0 ? { label: 'Start', run: onStartReview } : undefined,
    },
    {
      done: goalMet,
      title: activeBook ? `Read ${activeBook.title}` : 'Pick a book to read',
      detail: activeBook
        ? goalMet
          ? 'Daily goal met'
          : `Chapter ${chapterNumber} · ${minutesLeft} min left to reach your goal`
        : undefined,
      action: activeBook ? { label: 'Resume', run: () => onOpenBook(activeBook.id) } : { label: 'Add book', run: onOpenUpload },
    },
  ];

  const weekSummary = weeklyActivity.map(d => `${d.dayLabel}: ${d.minutes} minutes${d.metGoal ? ', goal met' : ''}`).join('; ');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8 animate-in fade-in duration-200">
      <h1 className="sr-only">Today</h1>

      {/* Today's plan — one primary action */}
      <section aria-labelledby="plan-heading" className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">Today’s plan</p>
            <h2 id="plan-heading" className="text-2xl md:text-3xl font-bold tracking-tight text-stone-950 dark:text-stone-50">
              {dueCardsCount > 0
                ? `${dueCardsCount} ${dueCardsCount === 1 ? 'card is' : 'cards are'} ready to review`
                : activeBook
                ? `Continue “${activeBook.title}”`
                : 'Start your reading habit'}
            </h2>
            {activeBook && (
              <p className="text-sm text-stone-600 dark:text-stone-400">
                {activeBook.author ? `by ${activeBook.author} · ` : ''}
                {activeBook.progress.percent}% complete
              </p>
            )}
          </div>

          <button
            onClick={primary.run}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 min-h-12 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-sm font-semibold rounded-xl shadow-xs shrink-0"
          >
            {!activeBook && dueCardsCount === 0 ? <Plus className="w-4 h-4" aria-hidden="true" /> : null}
            <span>{primary.label}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <ol className="divide-y divide-stone-100 dark:divide-stone-800 border-t border-stone-100 dark:border-stone-800">
          {planSteps.map(step => (
            <li key={step.title} className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-start gap-3 min-w-0">
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-700 dark:text-emerald-400 shrink-0" aria-label="Done" />
                ) : (
                  <Circle className="w-5 h-5 mt-0.5 text-stone-400 dark:text-stone-500 shrink-0" aria-label="To do" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{step.title}</p>
                  {step.detail && <p className="text-xs text-stone-600 dark:text-stone-400">{step.detail}</p>}
                </div>
              </div>
              {step.action && (
                <button
                  onClick={step.action.run}
                  className="px-3 py-1.5 min-h-9 text-xs font-semibold rounded-lg border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 shrink-0"
                >
                  {step.action.label}
                </button>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Habit indicators */}
      <section aria-label="Habit stats" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 flex items-center justify-center shrink-0" aria-hidden="true">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {settings.streakDays} {settings.streakDays === 1 ? 'day' : 'days'}
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-400">Reading streak</div>
          </div>
        </div>

        {dueCardsCount > 0 ? (
          <button
            onClick={onStartReview}
            className="text-left bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center gap-3.5 shadow-2xs hover:border-amber-500 dark:hover:border-amber-600 transition-colors"
          >
            <DueTile count={dueCardsCount} showCta />
          </button>
        ) : (
          <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center gap-3.5 shadow-2xs">
            <DueTile count={dueCardsCount} />
          </div>
        )}

        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center gap-4 shadow-2xs">
          <div
            role="progressbar"
            aria-label="Daily reading goal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={goalPercent}
            className="relative w-12 h-12 flex items-center justify-center shrink-0"
          >
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
              <circle cx="40" cy="40" r="34" className="stroke-stone-200 dark:stroke-stone-800" strokeWidth="8" fill="transparent" />
              <circle
                cx="40"
                cy="40"
                r="34"
                className="stroke-emerald-700 dark:stroke-emerald-400"
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 * (1 - goalPercent / 100)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-stone-900 dark:text-stone-100">
              {goalPercent}%
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold tracking-tight text-stone-900 dark:text-stone-100 truncate">
              {todayMinutes} / {goalMinutes} min
            </div>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-xs text-stone-600 dark:text-stone-400 truncate">{goalMet ? 'Goal met!' : `${minutesLeft}m left`}</span>
              <label htmlFor="daily-goal" className="sr-only">
                Daily reading goal
              </label>
              <select
                id="daily-goal"
                value={goalMinutes}
                onChange={async e => {
                  const updated = await updateAppSettings({ dailyGoalMinutes: Number(e.target.value) });
                  onUpdateSettings?.(updated);
                }}
                className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 bg-transparent cursor-pointer rounded-xs"
              >
                {[10, 15, 20, 30, 45, 60].map(m => (
                  <option key={m} value={m} className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
                    Goal: {m}m
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Last 7 days — value labels always visible; goal state not conveyed by colour alone */}
      {weeklyActivity.length > 0 && (
        <section aria-labelledby="week-heading" className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 id="week-heading" className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
              <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>Last 7 days</span>
            </h2>
            <span className="text-xs text-stone-600 dark:text-stone-400">Goal: {goalMinutes}m / day</span>
          </div>

          <div role="img" aria-label={`Reading minutes per day. ${weekSummary}`} className="grid grid-cols-7 gap-2 pt-2 items-end">
            {weeklyActivity.map(day => {
              const maxMinutes = Math.max(goalMinutes, ...weeklyActivity.map(d => d.minutes), 30);
              const heightPercent = Math.min(100, Math.round((day.minutes / maxMinutes) * 100));
              return (
                <div key={day.date} className="flex flex-col items-center gap-1.5 justify-end">
                  <span className="text-xs tabular-nums text-stone-700 dark:text-stone-300">
                    {day.minutes}m{day.metGoal ? ' ✓' : ''}
                  </span>
                  <div className="w-full max-w-8 bg-stone-100 dark:bg-stone-800 rounded-lg h-14 flex items-end p-0.5 overflow-hidden">
                    <div
                      className={`w-full rounded-md ${
                        day.metGoal ? 'bg-emerald-600' : day.minutes > 0 ? 'bg-amber-500' : 'bg-transparent'
                      }`}
                      style={{ height: `${Math.max(day.minutes > 0 ? 15 : 0, heightPercent)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-400">{day.dayLabel}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* More books */}
      {books.length > 1 && (
        <section aria-labelledby="more-books-heading" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 id="more-books-heading" className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              Other books
            </h2>
            <button
              onClick={onOpenLibrary}
              className="px-2 py-1.5 -mr-2 text-xs font-medium text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-stone-100 rounded-lg"
            >
              View all ({books.length})
            </button>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {books.slice(1, 3).map(b => (
              <li key={b.id}>
                <button
                  onClick={() => onOpenBook(b.id)}
                  className="w-full text-left p-3.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 transition-colors flex items-center justify-between"
                >
                  <span className="min-w-0 pr-2">
                    <span className="block text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{b.title}</span>
                    <span className="block text-xs text-stone-600 dark:text-stone-400 truncate">
                      {b.author || `${b.chapterCount} chapters`} · {b.progress.percent}% done
                    </span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-stone-600 dark:text-stone-400 shrink-0" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!activeBook && (
        <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center mx-auto" aria-hidden="true">
            <BookOpen className="w-6 h-6" />
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto">
            Upload a PDF to get chapters, summaries, key ideas and spaced-repetition flashcards.
          </p>
        </section>
      )}
    </div>
  );
}

function DueTile({ count, showCta = false }: { count: number; showCta?: boolean }) {
  return (
    <>
      <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 flex items-center justify-center shrink-0" aria-hidden="true">
        <Layers className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center justify-between">
          <span>{count}</span>
          {showCta && <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">Review →</span>}
        </div>
        <div className="text-xs text-stone-600 dark:text-stone-400">{count === 1 ? 'Card due for recall' : 'Cards due for recall'}</div>
      </div>
    </>
  );
}
