'use client';

import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Loader2 } from 'lucide-react';
import { AudioOverviewData } from '@/lib/db/types';

interface AudioOverviewControlsProps {
  data: AudioOverviewData;
  currentTurn: number;
  rate: number;
  onRateChange: (rate: number) => void;
  isPlaying: boolean;
  isSynthesizing: boolean;
  onTogglePlay: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
}

export function AudioOverviewControls({
  data,
  currentTurn,
  rate,
  onRateChange,
  isPlaying,
  isSynthesizing,
  onTogglePlay,
  onSkipBack,
  onSkipForward,
}: AudioOverviewControlsProps) {
  return (
    <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
            Turn {currentTurn + 1} of {data.turns.length}
          </span>
          <div className="flex items-center gap-1 bg-stone-200/80 dark:bg-stone-800 p-0.5 rounded-lg text-xs font-semibold">
            {[1.0, 1.25, 1.5].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => onRateChange(r)}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  rate === r
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                {r}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onSkipBack}
            disabled={currentTurn === 0}
            aria-label="Previous speaker"
            className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="p-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 shadow-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {isSynthesizing ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-400 dark:text-amber-600" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onSkipForward}
            disabled={currentTurn >= data.turns.length - 1}
            aria-label="Next speaker"
            className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
