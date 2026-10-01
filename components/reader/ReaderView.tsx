'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Minimize2 } from 'lucide-react';
import { Book, Chapter, AppSettings, Note } from '@/lib/db/types';
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
import { SelectionMenu } from './SelectionMenu';
import { ChapterOutline } from './ChapterOutline';
import { NotesPanel } from './NotesPanel';
import { ExplainDialog } from './ExplainDialog';
import { NoteDialog, NoteDraft } from './NoteDialog';
import { CardDraftDialog } from './CardDraftDialog';
import { AudioOverviewModal } from './AudioOverviewModal';
import { AssistantDrawer } from '../assistant/AssistantDrawer';
import type { CitationItem } from '../assistant/chatTypes';
import type { Command } from '@/components/navigation/CommandPalette';
import type { ReaderMode } from './readerModes';
import type { ReaderActions } from './readerActions';

export type { ReaderMode } from './readerModes';

interface ReaderViewProps {
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
  const [isAudioOverviewOpen, setIsAudioOverviewOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState<NoteDraft | null>(null);
  const articleRef = useRef<HTMLDivElement>(null);

  const activeChapter = chapters[currentChapterIndex] || chapters[0];
  const paragraphs = useMemo(() => formatChapterParagraphs(activeChapter.text), [activeChapter.text]);

  const { isViewing: isViewingOriginalPdf, pdfUrl, pdfState, toggle: toggleOriginalPdf } = useOriginalPdf(book.id);
  const { notes, chapterNotes, noteCounts, addHighlight, removeNote } = useReaderNotes(book, activeChapter);
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

  // ---- Navigation ----
  const goToChapter = (idx: number) => {
    if (idx < 0 || idx >= chapters.length) return;
    setCurrentChapterIndex(idx);
    clearSelection();
    resetForChapter(idx);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  // ---- Grounded Source Citation Jump & Pulse ----
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

  // ---- Selection actions (each consumes the native selection) ----
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
    await addHighlight(draft.quote, draft.text.trim());
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

  // ---- Shortcuts & command menu (latest closures via ref) ----
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

  // Seeded assistant prompt (from the command menu "Ask the assistant"): open the drawer when a new seed arrives
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
      className={`min-h-dvh flex flex-col justify-between transition-[padding] duration-200 ${themeClass} ${
        isAssistantOpen ? 'lg:pr-[26rem]' : ''
      }`}
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
          onClick={() => setIsFocusMode(false)}
          className="fixed top-4 right-4 z-40 [--focus:#fbbf24] bg-stone-900/90 hover:bg-stone-900 text-stone-100 rounded-full shadow-lg backdrop-blur-xs inline-flex items-center gap-1.5 text-xs px-4 min-h-10"
        >
          <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Exit focus mode (Esc)</span>
        </button>
      )}

      <main
        id="reader-panel"
        role="tabpanel"
        tabIndex={-1}
        aria-labelledby={`tab-${activeMode}`}
        className="flex-1 py-8 md:py-14 px-4 sm:px-6"
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

      <SelectionMenu
        position={selectionPosition}
        selectedText={selectedText}
        onExplain={explain}
        onSimplify={simplify}
        onHighlight={highlight}
        onMakeCard={startCard}
        onAddNote={startNote}
      />

      <ExplainDialog
        state={aiSelection}
        onClose={closeAiSelection}
        onRetry={runSelectionAI}
        onSaveAsNote={(quote, content) => {
          addHighlight(quote, content);
          closeAiSelection();
        }}
      />
      <NoteDialog draft={noteDraft} onChange={setNoteDraft} onCancel={() => setNoteDraft(null)} onSubmit={submitNote} />
      <CardDraftDialog
        draft={cardDraft}
        onChange={setCardDraft}
        onCancel={() => setCardDraft(null)}
        onSubmit={submitCard}
        onDraftQuestion={draftCardQuestion}
      />

      <ChapterOutline
        isOpen={isOutlineOpen}
        onClose={() => setIsOutlineOpen(false)}
        chapters={chapters}
        currentIndex={currentChapterIndex}
        progress={chapterProgress}
        noteCounts={noteCounts}
        onSelect={goToChapter}
      />
      <NotesPanel
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        chapterTitle={activeChapter.title}
        notes={chapterNotes}
        onDelete={n => removeNote(n)}
        onJump={jumpToNote}
      />

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

      <AssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        book={book}
        chapter={activeChapter}
        selectedText={selectedText}
        onClearSelection={() => setSelectedText('')}
        settings={settings}
        dueCardsCount={dueCardsCount}
        seedPrompt={assistantSeed}
        onSeedConsumed={onAssistantSeedConsumed}
        onCitationClick={handleCitationClick}
      />

      <AudioOverviewModal
        isOpen={isAudioOverviewOpen}
        onClose={() => setIsAudioOverviewOpen(false)}
        book={book}
        chapter={activeChapter}
        settings={settings}
      />
    </div>
  );
}
