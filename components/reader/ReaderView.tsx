'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Minimize2 } from 'lucide-react';
import { Book, Chapter, AppSettings, Note } from '@/lib/db/types';
import { saveCards } from '@/lib/db';
import { formatChapterParagraphs, normalizeQuote, prefersReducedMotion } from '@/lib/reader/text';
import { useReadingProgress } from '@/hooks/reader/useReadingProgress';
import { useTextSelection } from '@/hooks/reader/useTextSelection';
import { useReaderNotes } from '@/hooks/reader/useReaderNotes';
import { useSelectionAI } from '@/hooks/reader/useSelectionAI';
import { useCardDraft } from '@/hooks/reader/useCardDraft';
import { useOriginalPdf } from '@/hooks/reader/useOriginalPdf';
import { useLatestRef } from '@/hooks/useLatestRef';
import { useReaderShortcuts } from '@/hooks/reader/useReaderShortcuts';
import { useReaderCommands } from '@/hooks/reader/useReaderCommands';
import { ReaderHeader } from './ReaderHeader';
import { ReaderFooter } from './ReaderFooter';
import { ReaderArticle } from './ReaderArticle';
import { ReaderModePanel } from './ReaderModePanel';
import { PdfPane } from './PdfPane';
import { ReaderSidePanels } from './ReaderSidePanels';
import { ReaderDialogs } from './ReaderDialogs';
import type { NoteDraft } from './NoteDialog';
import type { CitationItem } from '../assistant/chatTypes';
import type { Command } from '@/components/navigation/CommandPalette';
import type { ReaderMode } from './readerModes';
import type { ReaderActions } from './readerActions';

export type { ReaderMode } from './readerModes';

export interface ReaderViewProps {
  book: Book;
  chapters: Chapter[];
  initialChapterIndex?: number;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onBackToLibrary: () => void;
  dueCardsCount?: number;
  onRegisterCommands?: (commands: Command[]) => void;
  assistantSeed?: string | null;
  onAssistantSeedConsumed?: () => void;
}

export function ReaderView({
  book,
  chapters,
  initialChapterIndex = 0,
  settings,
  onUpdateSettings,
  onBackToLibrary,
  dueCardsCount = 0,
  onRegisterCommands,
  assistantSeed,
  onAssistantSeedConsumed,
}: ReaderViewProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(
    Math.min(Math.max(0, initialChapterIndex), Math.max(0, chapters.length - 1))
  );
  const [activeMode, setActiveMode] = useState<ReaderMode>('read');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isAudioOverviewOpen, setIsAudioOverviewOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState<NoteDraft | null>(null);
  const articleRef = useRef<HTMLDivElement>(null);

  const activeChapter = chapters[currentChapterIndex] || chapters[0];
  const paragraphs = useMemo(() => formatChapterParagraphs(activeChapter.text), [activeChapter.text]);

  const { isViewing: isViewingOriginalPdf, pdfUrl, pdfState, toggle: toggleOriginalPdf } = useOriginalPdf(book.id);
  const { notes, chapterNotes, noteCounts, addHighlight, saveNoteItem, removeNote } = useReaderNotes(book, activeChapter);
  const { chapterProgress, resetForChapter, overallPercent } = useReadingProgress({
    book,
    chapters,
    currentChapterIndex,
    activeMode,
    isViewingOriginalPdf,
    articleRef,
  });
  const { selectedText, setSelectedText, selectionPosition, clearSelection } = useTextSelection(
    activeMode === 'read' && !isViewingOriginalPdf,
    articleRef
  );
  const { aiSelection, runSelectionAI, closeAiSelection } = useSelectionAI(book, activeChapter, settings);
  const { cardDraft, setCardDraft, startCardDraft, draftCardQuestion, submitCard } = useCardDraft(book, activeChapter, settings);

  // Navigation
  const goToChapter = (idx: number) => {
    if (idx < 0 || idx >= chapters.length) return;
    setCurrentChapterIndex(idx);
    clearSelection();
    resetForChapter(idx);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  // Grounded Source Citation Jump & Pulse
  const handleCitationClick = (citation: CitationItem) => {
    setActiveMode('read');
    setTimeout(() => {
      let targetEl: HTMLElement | null = null;
      if (typeof citation.approximateParagraph === 'number') {
        targetEl = articleRef.current?.querySelector(`[data-paragraph-index="${citation.approximateParagraph}"]`) as HTMLElement | null;
      }
      if (!targetEl && citation.quote) {
        const quoteSub = citation.quote.slice(0, 35).toLowerCase();
        const paragraphsList = Array.from(articleRef.current?.querySelectorAll('p') || []);
        targetEl = (paragraphsList.find(p => p.textContent?.toLowerCase().includes(quoteSub)) as HTMLElement) || null;
      }
      if (targetEl) {
        targetEl.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'center',
        });
        targetEl.classList.add('ring-2', 'ring-amber-500', 'bg-amber-100/70', 'dark:bg-amber-950/70', 'rounded-lg', 'transition-all');
        setTimeout(() => {
          targetEl?.classList.remove('ring-2', 'ring-amber-500', 'bg-amber-100/70', 'dark:bg-amber-950/70');
        }, 2500);
      }
    }, 120);
  };

  // Selection actions
  const explain = (t: string) => {
    clearSelection();
    runSelectionAI('explain_selection', t);
  };
  const simplify = (t: string) => {
    clearSelection();
    runSelectionAI('simplify_selection', t);
  };
  const highlight = (t: string) => {
    clearSelection();
    addHighlight(t);
  };
  const startNote = (t: string) => {
    clearSelection();
    setNoteDraft({ quote: normalizeQuote(t), text: '' });
  };
  const startCard = (t: string) => {
    clearSelection();
    const cleanT = normalizeQuote(t);
    const pIdx = paragraphs.findIndex(p => p.includes(cleanT) || cleanT.includes(p.slice(0, 40)));
    startCardDraft(t, pIdx >= 0 ? pIdx : undefined);
  };

  const submitNote = async () => {
    if (!noteDraft) return;
    const draft = noteDraft;
    setNoteDraft(null);
    await saveNoteItem(draft);
  };

  const editNote = (note: Note) => {
    setIsNotesOpen(false);
    setNoteDraft({ id: note.id, quote: note.quote, text: note.text });
  };

  const newCustomNote = () => {
    setIsNotesOpen(false);
    setIsWorkspaceOpen(true);
  };

  const jumpToNote = (note: Note) => {
    setIsNotesOpen(false);
    setActiveMode('read');
    setTimeout(() => {
      document.getElementById(`hl-${note.id}`)?.scrollIntoView({
        block: 'center',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }, 150);
  };

  // Keyboard shortcuts & command palette registration
  const actions: ReaderActions = {
    next: () => goToChapter(currentChapterIndex + 1),
    prev: () => goToChapter(currentChapterIndex - 1),
    goTo: goToChapter,
    setMode: setActiveMode,
    toggleFocus: () => setIsFocusMode(f => !f),
    exitFocus: () => setIsFocusMode(false),
    toggleAssistant: () => setIsAssistantOpen(o => !o),
    openOutline: () => setIsOutlineOpen(true),
    openNotes: () => setIsNotesOpen(true),
    openPrefs: () => setIsPreferencesOpen(true),
    togglePdf: toggleOriginalPdf,
    selection: key => {
      if (!selectedText) return false;
      const handlers: Record<string, (t: string) => void> = { h: highlight, n: startNote, c: startCard, e: explain, s: simplify };
      handlers[key]?.(selectedText);
      return key in handlers;
    },
  };
  const actionsRef = useLatestRef(actions);
  useReaderShortcuts(actionsRef);
  useReaderCommands(chapters, book.hasPdf, actionsRef, onRegisterCommands);

  // Seeded assistant prompt: open drawer when a new seed arrives
  const [lastSeed, setLastSeed] = useState(assistantSeed);
  if (assistantSeed !== lastSeed) {
    setLastSeed(assistantSeed);
    if (assistantSeed) setIsAssistantOpen(true);
  }

  const readerTheme = settings.readerTheme || 'paper';
  const themeClass = `reader-${readerTheme} ${readerTheme === 'sepia' ? 'force-light' : ''} ${readerTheme === 'dark' ? 'dark' : ''}`;
  const percent = overallPercent(activeChapter.id);

  return (
    <div
      style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}
      className={`min-h-dvh flex flex-col justify-between ${themeClass}`}
    >
      <a
        href="#reader-panel"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-70 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-white focus:text-stone-900 focus:shadow-lg"
      >
        Skip to content
      </a>

      {!isFocusMode && (
        <ReaderHeader
          book={book}
          chapters={chapters}
          currentChapterIndex={currentChapterIndex}
          activeChapter={activeChapter}
          activeMode={activeMode}
          overallPercent={percent}
          chapterNotesCount={chapterNotes.length}
          isViewingOriginalPdf={isViewingOriginalPdf}
          isAssistantOpen={isAssistantOpen}
          isPreferencesOpen={isPreferencesOpen}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onBack={onBackToLibrary}
          onGoToChapter={goToChapter}
          onModeChange={setActiveMode}
          onOpenOutline={() => setIsOutlineOpen(true)}
          onOpenNotes={() => setIsNotesOpen(true)}
          onTogglePdf={toggleOriginalPdf}
          onTogglePreferences={() => setIsPreferencesOpen(o => !o)}
          onClosePreferences={() => setIsPreferencesOpen(false)}
          onEnterFocus={() => setIsFocusMode(true)}
          onToggleAssistant={() => setIsAssistantOpen(o => !o)}
          onOpenAudioOverview={() => setIsAudioOverviewOpen(true)}
        />
      )}

      {isFocusMode && (
        <button
          type="button"
          onClick={() => setIsFocusMode(false)}
          className="fixed top-4 right-4 z-40 [--focus:#fbbf24] bg-stone-900/90 hover:bg-stone-900 text-stone-100 rounded-full shadow-lg backdrop-blur-xs inline-flex items-center gap-1.5 text-xs px-4 min-h-10 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Exit focus mode (Esc)</span>
        </button>
      )}

      <div className="flex-1 flex flex-col lg:flex-row items-stretch min-w-0">
        <main
          id="reader-panel"
          role="tabpanel"
          tabIndex={-1}
          aria-labelledby={`tab-${activeMode}`}
          className="flex-1 py-8 md:py-14 px-4 sm:px-6 min-w-0"
        >
          {isViewingOriginalPdf ? (
            <PdfPane url={pdfUrl} state={pdfState} title={`Original PDF for ${book.title}`} />
          ) : activeMode === 'read' ? (
            <ReaderArticle
              ref={articleRef}
              chapter={activeChapter}
              chapterIndex={currentChapterIndex}
              chapterCount={chapters.length}
              paragraphs={paragraphs}
              notes={chapterNotes}
              settings={settings}
              onPrev={() => goToChapter(currentChapterIndex - 1)}
              onNext={() => goToChapter(currentChapterIndex + 1)}
            />
          ) : (
            <ReaderModePanel mode={activeMode} book={book} chapter={activeChapter} settings={settings} />
          )}
        </main>

        <ReaderSidePanels
          isOutlineOpen={isOutlineOpen}
          onCloseOutline={() => setIsOutlineOpen(false)}
          chapters={chapters}
          currentChapterIndex={currentChapterIndex}
          chapterProgress={chapterProgress}
          noteCounts={noteCounts}
          onSelectChapter={goToChapter}
          isNotesOpen={isNotesOpen}
          onCloseNotes={() => setIsNotesOpen(false)}
          activeChapter={activeChapter}
          chapterNotes={chapterNotes}
          onDeleteNote={n => removeNote(n)}
          onJumpToNote={jumpToNote}
          onEditNote={editNote}
          onNewCustomNote={newCustomNote}
          onOpenWorkspace={() => setIsWorkspaceOpen(true)}
          isAssistantOpen={isAssistantOpen}
          onCloseAssistant={() => setIsAssistantOpen(false)}
          book={book}
          selectedText={selectedText}
          onClearSelection={clearSelection}
          settings={settings}
          dueCardsCount={dueCardsCount}
          assistantSeed={assistantSeed}
          onAssistantSeedConsumed={onAssistantSeedConsumed}
          onCitationClick={handleCitationClick}
        />
      </div>

      {!isFocusMode && (
        <ReaderFooter
          currentIndex={currentChapterIndex}
          total={chapters.length}
          percent={percent}
          onPrev={() => goToChapter(currentChapterIndex - 1)}
          onNext={() => goToChapter(currentChapterIndex + 1)}
          onOpenOutline={() => setIsOutlineOpen(true)}
        />
      )}

      <ReaderDialogs
        selectionPosition={selectionPosition}
        selectedText={selectedText}
        onExplain={explain}
        onSimplify={simplify}
        onHighlight={highlight}
        onMakeCard={startCard}
        onAddNote={startNote}
        aiSelection={aiSelection}
        onCloseAiSelection={closeAiSelection}
        onRetryAiSelection={(kind, text) => runSelectionAI(kind, text)}
        onSaveAiAsNote={(q, c) => saveNoteItem({ quote: q, text: c })}
        noteDraft={noteDraft}
        onChangeNoteDraft={setNoteDraft}
        onCancelNoteDraft={() => setNoteDraft(null)}
        onSubmitNoteDraft={submitNote}
        book={book}
        activeChapter={activeChapter}
        settings={settings}
        onFlashcardCreatedFromNote={async card => {
          await saveCards([card]);
        }}
        cardDraft={cardDraft}
        onChangeCardDraft={setCardDraft}
        onCancelCardDraft={() => setCardDraft(null)}
        onSubmitCardDraft={submitCard}
        onDraftCardQuestion={draftCardQuestion}
        isWorkspaceOpen={isWorkspaceOpen}
        onCloseWorkspace={() => setIsWorkspaceOpen(false)}
        chapters={chapters}
        notes={notes}
        onSaveNoteItem={saveNoteItem}
        onDeleteNoteItem={n => removeNote(n)}
        onFlashcardCreatedFromWorkspace={async card => {
          await saveCards([card]);
        }}
        isAudioOverviewOpen={isAudioOverviewOpen}
        onCloseAudioOverview={() => setIsAudioOverviewOpen(false)}
      />
    </div>
  );
}
