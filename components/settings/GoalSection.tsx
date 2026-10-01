'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { AppSettings } from '@/lib/db/types';
import { updateAppSettings } from '@/lib/db';

interface Props {
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

export function GoalSection({ settings, onUpdateSettings }: Props) {
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
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              {mins} mins / day
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
