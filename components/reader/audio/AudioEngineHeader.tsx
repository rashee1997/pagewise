'use client';

import React from 'react';
import { X, Radio, Cpu, Cloud, Volume2, Loader2 } from 'lucide-react';
import { AudioOverviewData, Chapter, TtsEngine } from '@/lib/db/types';
import { KokoroLoadProgress } from '@/lib/tts/kokoro';

interface AudioEngineHeaderProps {
  data: AudioOverviewData | null;
  chapter: Chapter;
  engine: TtsEngine;
  onSelectEngine: (engine: TtsEngine) => void;
  downloadProgress: KokoroLoadProgress | null;
  onClose: () => void;
}

export function AudioEngineHeader({
  data,
  chapter,
  engine,
  onSelectEngine,
  downloadProgress,
  onClose,
}: AudioEngineHeaderProps) {
  return (
    <>
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0 bg-stone-50/50 dark:bg-stone-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                {data ? data.title : 'Chapter Audio Overview'}
              </h2>
              {data && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  {data.durationEstimate}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Two-Host Conversational Deep Dive · {chapter.title}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close audio overview"
          className="p-2 rounded-xl text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Engine Switcher Bar */}
      <div className="px-4 py-2 bg-stone-100/70 dark:bg-stone-800/50 border-b border-stone-200/80 dark:border-stone-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-stone-600 dark:text-stone-400">
          <span>Voice Engine:</span>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-stone-900 p-0.5 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onSelectEngine('local-wasm')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 ${
              engine === 'local-wasm'
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 shadow-2xs font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Local WASM (Natural)</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectEngine('gemini-cloud')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 ${
              engine === 'gemini-cloud'
                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 shadow-2xs font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Gemini Studio TTS</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectEngine('system')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 ${
              engine === 'system'
                ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* First-time download progress banner (for local WASM) */}
      {downloadProgress && downloadProgress.status === 'downloading' && (
        <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/50 text-xs space-y-1.5 animate-in fade-in" role="progressbar" aria-valuenow={downloadProgress.progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="flex items-center justify-between text-amber-900 dark:text-amber-200 font-semibold text-xs">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
              <span>{downloadProgress.message || 'Downloading local neural voice model (~80MB)...'}</span>
            </span>
            <span>{downloadProgress.progress}%</span>
          </div>
          <div className="w-full bg-amber-200/60 dark:bg-amber-900/50 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-600 dark:bg-amber-400 h-full transition-all duration-150"
              style={{ width: `${downloadProgress.progress}%` }}
            />
          </div>
        </div>
      )}
    </>
  );
}
