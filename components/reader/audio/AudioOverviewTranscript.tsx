'use client';

import React, { useEffect, useRef } from 'react';
import { Headphones, Sparkles, Loader2, RotateCcw, Volume2 } from 'lucide-react';
import { AudioOverviewData, Chapter } from '@/lib/db/types';

interface AudioOverviewTranscriptProps {
  data: AudioOverviewData | null;
  chapter: Chapter;
  isLoading: boolean;
  error: string | null;
  currentTurn: number;
  isPlaying: boolean;
  isSynthesizing: boolean;
  onPlayTurn: (idx: number) => void;
  onGenerate: () => void;
}

export function AudioOverviewTranscript({
  data,
  chapter,
  isLoading,
  error,
  currentTurn,
  isPlaying,
  isSynthesizing,
  onPlayTurn,
  onGenerate,
}: AudioOverviewTranscriptProps) {
  const activeTurnRef = useRef<HTMLDivElement>(null);

  // Autoscroll transcript to active speaker
  useEffect(() => {
    activeTurnRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [currentTurn]);

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
      {isLoading && (
        <div className="py-20 text-center space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto animate-pulse motion-reduce:animate-none">
            <Headphones className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Generating Conversational Audio Briefing...
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto">
              Alex (The Guide) and Morgan (The Analyst) are synthesizing chapter themes into an analytical dialogue.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
            <span>Analyzing full chapter context...</span>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl text-xs text-red-800 dark:text-red-300 space-y-2">
          <p className="font-semibold">Playback error</p>
          <p>{error}</p>
          <button
            type="button"
            onClick={onGenerate}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-xs shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Retry Generation
          </button>
        </div>
      )}

      {!isLoading && !data && !error && (
        <div className="py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Headphones className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Listen to a 2-Host Deep Dive
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Transform this chapter into a lively, podcast-style audio conversation between Alex and Morgan. Powered by natural local in-browser neural voice synthesis and Gemini 3.8 Studio TTS.
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center gap-2 px-5 py-3 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 font-semibold text-xs sm:text-sm rounded-2xl shadow-xs transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Sparkles className="w-4 h-4 text-amber-400 dark:text-amber-600" />
            <span>Generate Audio Overview</span>
          </button>
        </div>
      )}

      {/* Live Transcript when data is ready */}
      {!isLoading && data && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 text-xs text-stone-600 dark:text-stone-400 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <span>Interactive Dialogue Transcript</span>
              {isSynthesizing && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                  <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" />
                  <span>Synthesizing voice...</span>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onGenerate}
              className="inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-200 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
              title="Regenerate episode script"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Regenerate Script</span>
            </button>
          </div>

          <div className="space-y-3">
            {data.turns.map((turn, idx) => {
              const isActive = idx === currentTurn;
              const isGuide = turn.speaker === 'guide';
              return (
                <div
                  key={idx}
                  ref={isActive ? activeTurnRef : null}
                  onClick={() => onPlayTurn(idx)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                    isActive
                      ? 'border-amber-400 dark:border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs ring-1 ring-amber-400/50'
                      : 'border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 hover:border-stone-300 dark:hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          isGuide
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        }`}
                      >
                        {isGuide ? 'A' : 'M'}
                      </span>
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {turn.speakerName}
                      </span>
                    </div>
                    {isActive && (
                      <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                        {isSynthesizing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" />
                            <span>Loading Voice</span>
                          </>
                        ) : isPlaying ? (
                          <>
                            <Volume2 className="w-3.5 h-3.5 animate-pulse motion-reduce:animate-none" />
                            <span>Speaking</span>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <p
                    className={`text-xs sm:text-sm leading-relaxed ${
                      isActive
                        ? 'text-stone-950 dark:text-stone-50 font-medium'
                        : 'text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {turn.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
