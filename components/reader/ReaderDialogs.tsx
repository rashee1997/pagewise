'use client';

import React from 'react';
import { Book, Chapter, AppSettings, FlashCard, Note } from '@/lib/db/types';
import { SelectionMenu } from './SelectionMenu';
import { ExplainDialog } from './ExplainDialog';
import { NoteDialog, NoteDraft } from './NoteDialog';
import { CardDraftDialog } from './CardDraftDialog';
import { NotesWorkspaceModal } from './NotesWorkspaceModal';
import { AudioOverviewModal } from './AudioOverviewModal';
import type { AiSelectionState } from '@/hooks/reader/useSelectionAI';
import type { CardDraft } from '@/hooks/reader/useCardDraft';

interface ReaderDialogsProps {
  // Selection menu
  selectionPosition: { x: number; y: number } | null;
  selectedText: string;
  onExplain: (text: string) => void;
  onSimplify: (text: string) => void;
  onHighlight: (text: string) => void;
  onMakeCard: (text: string) => void;
  onAddNote: (text: string) => void;

  // Explain / Simplify dialog
  aiSelection: AiSelectionState | null;
  onCloseAiSelection: () => void;
  onRetryAiSelection: (kind: AiSelectionState['kind'], text: string) => void;
  onSaveAiAsNote: (quote: string, content: string) => void;

  // Note dialog
  noteDraft: NoteDraft | null;
  onChangeNoteDraft: (draft: NoteDraft) => void;
  onCancelNoteDraft: () => void;
  onSubmitNoteDraft: () => void;
  book: Book;
  activeChapter: Chapter;
  settings: AppSettings;
  onFlashcardCreatedFromNote?: (card: FlashCard) => void;

  // Card draft dialog
  cardDraft: CardDraft | null;
  onChangeCardDraft: (draft: CardDraft) => void;
  onCancelCardDraft: () => void;
  onSubmitCardDraft: () => void;
  onDraftCardQuestion: () => void;

  // Workspace modal
  isWorkspaceOpen: boolean;
  onCloseWorkspace: () => void;
  chapters: Chapter[];
  notes: Note[];
  onSaveNoteItem: (draft: NoteDraft) => Promise<void>;
  onDeleteNoteItem: (note: Note) => Promise<void>;
  onFlashcardCreatedFromWorkspace: (card: FlashCard) => Promise<void>;

  // Audio overview modal
  isAudioOverviewOpen: boolean;
  onCloseAudioOverview: () => void;
}

export function ReaderDialogs({
  selectionPosition,
  selectedText,
  onExplain,
  onSimplify,
  onHighlight,
  onMakeCard,
  onAddNote,
  aiSelection,
  onCloseAiSelection,
  onRetryAiSelection,
  onSaveAiAsNote,
  noteDraft,
  onChangeNoteDraft,
  onCancelNoteDraft,
  onSubmitNoteDraft,
  book,
  activeChapter,
  settings,
  onFlashcardCreatedFromNote,
  cardDraft,
  onChangeCardDraft,
  onCancelCardDraft,
  onSubmitCardDraft,
  onDraftCardQuestion,
  isWorkspaceOpen,
  onCloseWorkspace,
  chapters,
  notes,
  onSaveNoteItem,
  onDeleteNoteItem,
  onFlashcardCreatedFromWorkspace,
  isAudioOverviewOpen,
  onCloseAudioOverview,
}: ReaderDialogsProps) {
  return (
    <>
      <SelectionMenu
        position={selectionPosition}
        selectedText={selectedText}
        onExplain={onExplain}
        onSimplify={onSimplify}
        onHighlight={onHighlight}
        onMakeCard={onMakeCard}
        onAddNote={onAddNote}
      />

      <ExplainDialog
        state={aiSelection}
        onClose={onCloseAiSelection}
        onRetry={onRetryAiSelection}
        onSaveAsNote={onSaveAiAsNote}
      />

      <NoteDialog
        draft={noteDraft}
        onChange={onChangeNoteDraft}
        onCancel={onCancelNoteDraft}
        onSubmit={onSubmitNoteDraft}
        bookTitle={book.title}
        chapterTitle={activeChapter.title}
        chapterText={activeChapter.text}
        settings={settings}
        bookId={book.id}
        chapterId={activeChapter.id}
        onFlashcardCreated={onFlashcardCreatedFromNote}
      />

      <CardDraftDialog
        draft={cardDraft}
        onChange={onChangeCardDraft}
        onCancel={onCancelCardDraft}
        onSubmit={onSubmitCardDraft}
        onDraftQuestion={onDraftCardQuestion}
      />

      <NotesWorkspaceModal
        isOpen={isWorkspaceOpen}
        onClose={onCloseWorkspace}
        book={book}
        chapters={chapters}
        notes={notes}
        onSaveNote={onSaveNoteItem}
        onDeleteNote={onDeleteNoteItem}
        settings={settings}
        onFlashcardCreated={onFlashcardCreatedFromWorkspace}
      />

      <AudioOverviewModal
        isOpen={isAudioOverviewOpen}
        onClose={onCloseAudioOverview}
        book={book}
        chapter={activeChapter}
        settings={settings}
      />
    </>
  );
}
