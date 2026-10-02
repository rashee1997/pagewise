'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  SlidersHorizontal,
  Maximize2,
  List,
  StickyNote,
  MoreHorizontal,
  Volume2,
  FileType,
  Headphones,
} from 'lucide-react';
import { AppSettings, Book, Chapter } from '@/lib/db/types';
import { ModeTabs } from './ModeTabs';
import { ToolsMenu, ToolsMenuItem } from './ToolsMenu';
import { ReaderPreferences } from './ReaderPreferences';
import { TtsPlayer } from './TtsPlayer';
import type { ReaderMode } from './readerModes';

const iconBtn =
  'p-2.5 min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors';

interface ReaderHeaderProps {
  book: Book;
  chapters: Chapter[];
  currentChapterIndex: number;
  activeChapter: Chapter;
  activeMode: ReaderMode;
  overallPercent: number;
  chapterNotesCount: number;
  isViewingOriginalPdf: boolean;
  isAssistantOpen: boolean;
  isPreferencesOpen: boolean;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onBack: () => void;
  onGoToChapter: (index: number) => void;
  onModeChange: (mode: ReaderMode) => void;
  onOpenOutline: () => void;
  onOpenNotes: () => void;
  onTogglePdf: () => void;
  onTogglePreferences: () => void;
  onClosePreferences: () => void;
  onEnterFocus: () => void;
  onToggleAssistant: () => void;
  onOpenAudioOverview?: () => void;
}

/** Sticky reader chrome: progress, chapter picker, study-mode tabs and tools (collapsed into a menu on phones). */
export function ReaderHeader(p: ReaderHeaderProps) {
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [showMobileTts, setShowMobileTts] = useState(false);

  const toolsMenuItems: ToolsMenuItem[] = [
    {
      label: 'Audio briefing (Podcast)',
      icon: <Headphones className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      run: () => p.onOpenAudioOverview?.(),
    },
    {
      label: `Highlights & notes${p.chapterNotesCount ? ` (${p.chapterNotesCount})` : ''}`,
      icon: <StickyNote className="w-4 h-4" />,
      run: p.onOpenNotes,
    },
    { label: 'Read aloud', icon: <Volume2 className="w-4 h-4" />, run: () => setShowMobileTts(v => !v) },
    {
      label: p.isViewingOriginalPdf ? 'Show clean text' : 'Original PDF',
      icon: <FileType className="w-4 h-4" />,
      run: p.onTogglePdf,
      hidden: !p.book.hasPdf,
    },
    { label: 'Reading appearance', icon: <SlidersHorizontal className="w-4 h-4" />, run: p.onTogglePreferences },
    { label: 'Focus mode', icon: <Maximize2 className="w-4 h-4" />, run: p.onEnterFocus },
  ];

  return (
    <header className="reader-chrome sticky top-0 z-(--z-sticky) backdrop-blur-md border-b">
      <div
        role="progressbar"
        aria-label="Book progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p.overallPercent}
        className="w-full bg-stone-200/60 dark:bg-stone-800/60 h-0.5 overflow-hidden"
      >
        <div
          className="bg-stone-900 dark:bg-stone-100 h-full w-full origin-left transition-transform duration-300"
          style={{ transform: `scaleX(${p.overallPercent / 100})` }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <button onClick={p.onBack} aria-label="Back to library" title="Back to library" className={`${iconBtn} shrink-0`}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xs md:text-sm font-bold truncate">{p.book.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <button onClick={p.onOpenOutline} aria-label="Chapters outline" title="Chapters" className={iconBtn}>
            <List className="w-4 h-4" />
          </button>

          {/* Secondary tools: inline on wider screens */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={p.onOpenNotes}
              aria-label={`Highlights and notes${p.chapterNotesCount ? `, ${p.chapterNotesCount} in this chapter` : ''}`}
              title="Highlights & notes"
              className={`${iconBtn} relative`}
            >
              <StickyNote className="w-4 h-4" />
              {p.chapterNotesCount > 0 && (
                <span aria-hidden="true" className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-amber-700 text-white text-xs leading-4 text-center">
                  {p.chapterNotesCount}
                </span>
              )}
            </button>
            {p.book.hasPdf && (
              <button
                onClick={p.onTogglePdf}
                aria-pressed={p.isViewingOriginalPdf}
                className={`px-3 py-2 min-h-10 rounded-xl text-xs font-medium border transition-colors ${
                  p.isViewingOriginalPdf
                    ? 'bg-stone-900 text-stone-100 border-stone-900 dark:bg-stone-100 dark:text-stone-900'
                    : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {p.isViewingOriginalPdf ? 'Clean text' : 'Original PDF'}
              </button>
            )}
            {/* Audio Overview (NotebookLM Podcast Briefing) */}
            <button
              onClick={p.onOpenAudioOverview}
              aria-label="Chapter audio overview podcast"
              title="Audio briefing (Two-host podcast)"
              className={iconBtn}
            >
              <Headphones className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </button>
            <TtsPlayer
              textToRead={p.activeChapter.text}
              chapterTitle={p.activeChapter.title}
              settings={p.settings}
            />
            <button
              onClick={p.onTogglePreferences}
              aria-label="Reading appearance"
              aria-expanded={p.isPreferencesOpen}
              title="Reading appearance"
              className={iconBtn}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button onClick={p.onEnterFocus} aria-label="Enter focus mode" title="Focus mode (F)" className={iconBtn}>
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* …collapsed into a menu on phones */}
          <div className="relative md:hidden">
            <button
              onClick={() => setIsToolsMenuOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={isToolsMenuOpen}
              aria-label="More reader tools"
              className={iconBtn}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {isToolsMenuOpen && <ToolsMenu items={toolsMenuItems} onClose={() => setIsToolsMenuOpen(false)} />}
          </div>

          <button
            onClick={p.onToggleAssistant}
            aria-expanded={p.isAssistantOpen}
            aria-keyshortcuts="Control+J Meta+J"
            aria-label="AI Study assistant"
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-10 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold rounded-xl hover:opacity-90 shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 dark:text-amber-700" aria-hidden="true" />
            <span className="hidden sm:inline">AI Study</span>
          </button>
        </div>
      </div>

      <ModeTabs active={p.activeMode} onChange={p.onModeChange} />

      {showMobileTts && (
        <div className="md:hidden px-4 py-2 border-t border-stone-200 dark:border-stone-800 flex justify-center">
          <TtsPlayer
            textToRead={p.activeChapter.text}
            chapterTitle={p.activeChapter.title}
            settings={p.settings}
          />
        </div>
      )}

      <ReaderPreferences
        isOpen={p.isPreferencesOpen}
        onClose={p.onClosePreferences}
        settings={p.settings}
        onUpdateSettings={p.onUpdateSettings}
      />
    </header>
  );
}
