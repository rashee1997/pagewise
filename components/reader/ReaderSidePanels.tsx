'use client';

import React from 'react';
import { Book, Chapter, AppSettings, Note } from '@/lib/db/types';
import { ChapterOutline } from './ChapterOutline';
import { NotesPanel } from './NotesPanel';
import { AssistantDrawer } from '../assistant/AssistantDrawer';
import type { CitationItem } from '../assistant/chatTypes';

interface ReaderSidePanelsProps {
  isOutlineOpen: boolean;
  onCloseOutline: () => void;
  chapters: Chapter[];
  currentChapterIndex: number;
  chapterProgress: Record<string, number>;
  noteCounts: Record<string, number>;
  onSelectChapter: (idx: number) => void;

  isNotesOpen: boolean;
  onCloseNotes: () => void;
  activeChapter: Chapter;
  chapterNotes: Note[];
  onDeleteNote: (note: Note) => void;
  onJumpToNote: (note: Note) => void;
  onEditNote: (note: Note) => void;
  onNewCustomNote: () => void;
  onOpenWorkspace: () => void;

  isAssistantOpen: boolean;
  onCloseAssistant: () => void;
  book: Book;
  selectedText: string;
  onClearSelection: () => void;
  settings: AppSettings;
  dueCardsCount?: number;
  assistantSeed?: string | null;
  onAssistantSeedConsumed?: () => void;
  onCitationClick: (citation: CitationItem) => void;
}

export function ReaderSidePanels({
  isOutlineOpen,
  onCloseOutline,
  chapters,
  currentChapterIndex,
  chapterProgress,
  noteCounts,
  onSelectChapter,
  isNotesOpen,
  onCloseNotes,
  activeChapter,
  chapterNotes,
  onDeleteNote,
  onJumpToNote,
  onEditNote,
  onNewCustomNote,
  onOpenWorkspace,
  isAssistantOpen,
  onCloseAssistant,
  book,
  selectedText,
  onClearSelection,
  settings,
  dueCardsCount,
  assistantSeed,
  onAssistantSeedConsumed,
  onCitationClick,
}: ReaderSidePanelsProps) {
  return (
    <>
      {/* Desktop Inline Side Panels */}
      <div className="hidden lg:flex shrink-0">
        <ChapterOutline
          isOpen={isOutlineOpen}
          onClose={onCloseOutline}
          chapters={chapters}
          currentIndex={currentChapterIndex}
          progress={chapterProgress}
          noteCounts={noteCounts}
          onSelect={onSelectChapter}
          inline={true}
        />
        <NotesPanel
          isOpen={isNotesOpen}
          onClose={onCloseNotes}
          chapterTitle={activeChapter.title}
          notes={chapterNotes}
          onDelete={onDeleteNote}
          onJump={onJumpToNote}
          onEdit={onEditNote}
          onNewCustomNote={onNewCustomNote}
          onOpenWorkspace={onOpenWorkspace}
          inline={true}
        />
        <AssistantDrawer
          isOpen={isAssistantOpen}
          onClose={onCloseAssistant}
          book={book}
          chapter={activeChapter}
          selectedText={selectedText}
          onClearSelection={onClearSelection}
          settings={settings}
          dueCardsCount={dueCardsCount}
          seedPrompt={assistantSeed}
          onSeedConsumed={onAssistantSeedConsumed}
          onCitationClick={onCitationClick}
          inline={true}
        />
      </div>

      {/* Mobile Dialog Drawers */}
      <div className="lg:hidden">
        <ChapterOutline
          isOpen={isOutlineOpen}
          onClose={onCloseOutline}
          chapters={chapters}
          currentIndex={currentChapterIndex}
          progress={chapterProgress}
          noteCounts={noteCounts}
          onSelect={onSelectChapter}
          inline={false}
        />
        <NotesPanel
          isOpen={isNotesOpen}
          onClose={onCloseNotes}
          chapterTitle={activeChapter.title}
          notes={chapterNotes}
          onDelete={onDeleteNote}
          onJump={onJumpToNote}
          onEdit={onEditNote}
          onNewCustomNote={onNewCustomNote}
          onOpenWorkspace={onOpenWorkspace}
          inline={false}
        />
        <AssistantDrawer
          isOpen={isAssistantOpen}
          onClose={onCloseAssistant}
          book={book}
          chapter={activeChapter}
          selectedText={selectedText}
          onClearSelection={onClearSelection}
          settings={settings}
          dueCardsCount={dueCardsCount}
          seedPrompt={assistantSeed}
          onSeedConsumed={onAssistantSeedConsumed}
          onCitationClick={onCitationClick}
          inline={false}
        />
      </div>
    </>
  );
}
