'use client';

import React from 'react';
import { Clock, Brain } from 'lucide-react';
import { AppSettings } from '@/lib/db/types';
import { updateAppSettings } from '@/lib/db';

interface Props {
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

export function GoalSection({ settings, onUpdateSettings }: Props) {
  const currentRetention = settings.targetRetention ?? 0.90;

  return (
    <>
      {/* 2. Daily Reading Goals */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Daily Reading Goal
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Set your target reading time to build a consistent habit
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {[10, 15, 20, 30, 45, 60].map(mins => (
            <button
              key={mins}
              aria-pressed={settings.dailyGoalMinutes === mins}
              onClick={async () => {
                const updated = await updateAppSettings({ dailyGoalMinutes: mins });
                onUpdateSettings(updated);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                settings.dailyGoalMinutes === mins
                  ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {mins} mins / day
            </button>
          ))}
        </div>
      </section>

      {/* 3. FSRS Target Retention Scheduler */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center">
            <Brain className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Spaced Repetition Target Recall (FSRS v5)
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Target probability of recalling a flashcard when it becomes due
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {[
            { rate: 0.80, label: '80%', desc: 'Lightest workload' },
            { rate: 0.85, label: '85%', desc: 'Balanced interval' },
            { rate: 0.90, label: '90%', desc: 'Recommended standard' },
            { rate: 0.95, label: '95%', desc: 'Maximum mastery' },
          ].map(item => {
            const isSelected = Math.abs(currentRetention - item.rate) < 0.02;
            return (
              <button
                key={item.rate}
                type="button"
                aria-pressed={isSelected}
                onClick={async () => {
                  const updated = await updateAppSettings({ targetRetention: item.rate });
                  onUpdateSettings(updated);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-stone-900 dark:border-stone-100 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 text-stone-800 dark:text-stone-200 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <div className="text-sm font-bold">{item.label}</div>
                <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-stone-200 dark:text-stone-700' : 'text-stone-500 dark:text-stone-400'}`}>
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
          FSRS adjusts card intervals according to forgetting curve stability ($S$). Targeting 90% balances high retention with reasonable daily review loads.
        </p>
      </section>
    </>
  );
}
