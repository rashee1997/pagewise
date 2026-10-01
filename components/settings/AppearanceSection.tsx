'use client';

import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { AppSettings } from '@/lib/db/types';
import { updateAppSettings } from '@/lib/db';

interface Props {
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

export function AppearanceSection({ settings, onUpdateSettings }: Props) {
  return (
    <>
      {/* 3. Appearance */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              App Appearance
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Light, dark, or system matching theme
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['system', 'light', 'dark'] as const).map(themeOption => (
            <button
              key={themeOption}
              aria-pressed={settings.theme === themeOption}
              onClick={async () => {
                const updated = await updateAppSettings({ theme: themeOption });
                onUpdateSettings(updated);
              }}
              className={`p-3 rounded-xl border text-xs font-semibold capitalize flex items-center justify-center gap-2 transition-all ${
                settings.theme === themeOption
                  ? 'border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-2xs'
                  : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300'
              }`}
            >
              {themeOption === 'light' && <Sun className="w-4 h-4" />}
              {themeOption === 'dark' && <Moon className="w-4 h-4" />}
              {themeOption === 'system' && <Laptop className="w-4 h-4" />}
              <span>{themeOption}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
