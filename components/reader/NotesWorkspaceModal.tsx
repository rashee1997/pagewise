'use client';

import React, { useState, useMemo, useRef } from 'react';
import { X, Plus, BookOpen, Layers } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { Note, Book, Chapter, AppSettings, FlashCard } from '@/lib/db/types';
import { createInitialFsrsState } from '@/lib/study/fsrs';
import { NotesSidebarList } from './notes/NotesSidebarList';
import { NoteEditorToolbar } from './notes/NoteEditorToolbar';
import { NoteMarkdownEditor } from './notes/NoteMarkdownEditor';
import { NoteAiAssistantBar } from './notes/NoteAiAssistantBar';

export interface NotesWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  chapters: Chapter[];
  notes: Note[];
  onSaveNote: (draft: { id?: string; chapterId: string; quote?: string; text: string }) => Promise<void>;
  onDeleteNote: (note: Note) => void;
  settings: AppSettings;
  onFlashcardCreated: (card: FlashCard) => void;
}

export function NotesWorkspaceModal({
  isOpen,
  onClose,
  book,
  chapters,
  notes,
  onSaveNote,
  onDeleteNote,
  settings,
  onFlashcardCreated,
}: NotesWorkspaceModalProps) {
  const toast = useToast();
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes[0]?.id || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<{ id?: string; chapterId: string; quote?: string; text: string }>({
    chapterId: chapters[0]?.id || '',
    quote: '',
    text: '',
  });
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [mobileShowEditor, setMobileShowEditor] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchChapter = selectedChapterId === 'all' || n.chapterId === selectedChapterId;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || n.text.toLowerCase().includes(q) || (n.quote && n.quote.toLowerCase().includes(q));
      return matchChapter && matchSearch;
    });
  }, [notes, selectedChapterId, searchQuery]);

  // Active note object
  const activeNote = useMemo(() => {
    if (activeNoteId) {
      const found = notes.find(n => n.id === activeNoteId);
      if (found) return found;
    }
    return filteredNotes[0] || notes[0] || null;
  }, [notes, activeNoteId, filteredNotes]);

  const handleSelectNote = (note: Note) => {
    setActiveNoteId(note.id);
    setEditDraft({
      id: note.id,
      chapterId: note.chapterId,
      quote: note.quote || '',
      text: note.text,
    });
    setIsEditing(false);
    setMobileShowEditor(true);
  };

  const handleStartNewNote = () => {
    setActiveNoteId(null);
    setEditDraft({
      chapterId: selectedChapterId !== 'all' ? selectedChapterId : chapters[0]?.id || '',
      quote: '',
      text: '',
    });
    setIsEditing(true);
    setMobileShowEditor(true);
  };

  const handleStartEdit = () => {
    if (!activeNote) return;
    setEditDraft({
      id: activeNote.id,
      chapterId: activeNote.chapterId,
      quote: activeNote.quote || '',
      text: activeNote.text,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    await onSaveNote(editDraft);
    setIsEditing(false);
    toast({ message: 'Note saved successfully' });
  };

  const insertMarkdown = (before: string, after: string = '', defaultText = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = editDraft.text;
    const selected = value.substring(start, end) || defaultText;
    const newValue = value.substring(0, start) + before + selected + after + value.substring(end);
    setEditDraft({ ...editDraft, text: newValue });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const runAiCommand = async (customInstruction?: string) => {
    const instruction = customInstruction || aiPrompt.trim();
    if (!instruction) return;
    setIsAiLoading(true);
    try {
      const chapter = chapters.find(c => c.id === editDraft.chapterId) || chapters[0];
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'note_ai',
          bookTitle: book.title,
          chapterTitle: chapter?.title || 'Chapter',
          chapterText: chapter?.text || '',
          selectedText: editDraft.text || editDraft.quote || '',
          userPrompt: instruction,
          provider: settings?.provider,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'AI request failed');
      if (data.text) {
        const appended = editDraft.text ? `${editDraft.text}\n\n${data.text}` : data.text;
        setEditDraft({ ...editDraft, text: appended });
        setAiPrompt('');
        setIsEditing(true);
        toast({ message: 'AI insights added to note' });
      }
    } catch (e: any) {
      toast({ message: e?.message || 'AI request failed', tone: 'error' });
    } finally {
      setIsAiLoading(false);
    }
  };

  const generateFlashcardFromActive = async () => {
    if (!editDraft.text.trim()) return;
    setIsAiLoading(true);
    try {
      const chapter = chapters.find(c => c.id === editDraft.chapterId) || chapters[0];
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'cards',
          bookTitle: book.title,
          chapterTitle: chapter?.title || 'Chapter',
          chapterText: chapter?.text || '',
          selectedText: editDraft.text,
          provider: settings?.provider,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to generate flashcard');
      const cards = data.data || [];
      if (cards.length > 0) {
        const c = cards[0];
        const newCard: FlashCard = {
          id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          bookId: book.id,
          chapterId: chapter?.id || 'chap_1',
          chapterTitle: chapter?.title || 'Chapter',
          type: c.type || 'concept',
          front: c.front,
          back: c.back,
          hint: c.hint,
          conceptKey: c.conceptKey || `note-fc-${Date.now()}`,
          fingerprint: `fp_${Date.now()}`,
          fsrs: createInitialFsrsState(),
          createdAt: Date.now(),
        };
        onFlashcardCreated(newCard);
        toast({ message: '✨ Flashcard created and added to your study deck!' });
      }
    } catch (e: any) {
      toast({ message: e?.message || 'Failed to generate flashcard', tone: 'error' });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Notes & AI Workspace"
      hideTitle
      panelClassName="w-full h-full sm:w-[95vw] sm:max-w-5xl sm:h-[85dvh] bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-stone-200 dark:border-stone-800 shrink-0 bg-stone-50/50 dark:bg-stone-900/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-700 dark:text-amber-300 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold truncate">Notes &amp; AI Workspace</h2>
            <p className="text-xs text-stone-600 dark:text-stone-400 truncate">
              {book.title} &bull; {notes.length} notes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleStartNewNote}
            className="px-3 py-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm hover:opacity-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Custom Note</span>
            <span className="sm:hidden">New</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notes workspace"
            className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        <NotesSidebarList
          notes={notes}
          filteredNotes={filteredNotes}
          chapters={chapters}
          selectedChapterId={selectedChapterId}
          onSelectChapterId={setSelectedChapterId}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          activeNoteId={activeNoteId}
          onSelectNote={handleSelectNote}
          mobileShowEditor={mobileShowEditor}
        />

        {/* Right Main Area: Large WYSIWYG Editor & AI Workspace */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-stone-900 overflow-hidden ${
            !mobileShowEditor ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {activeNote || isEditing ? (
            <>
              <NoteEditorToolbar
                chapters={chapters}
                chapterId={editDraft.chapterId}
                isEditing={isEditing}
                activeNote={activeNote}
                activeTab={activeTab}
                onSetActiveTab={setActiveTab}
                onStartEdit={handleStartEdit}
                onSave={handleSave}
                onDeleteNote={onDeleteNote}
                onBackToList={() => setMobileShowEditor(false)}
              />

              <div className="flex-1 flex flex-col overflow-y-auto">
                <NoteMarkdownEditor
                  isEditing={isEditing}
                  activeNote={activeNote}
                  activeTab={activeTab}
                  quote={editDraft.quote || ''}
                  text={editDraft.text}
                  onTextChange={newText => setEditDraft({ ...editDraft, text: newText })}
                  textareaRef={textareaRef}
                  onInsertMarkdown={insertMarkdown}
                />

                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <NoteAiAssistantBar
                    aiPrompt={aiPrompt}
                    onAiPromptChange={setAiPrompt}
                    isAiLoading={isAiLoading}
                    onRunAiCommand={runAiCommand}
                    onGenerateFlashcard={generateFlashcardFromActive}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <Layers className="w-10 h-10 text-stone-400" />
              <p className="font-semibold text-stone-700 dark:text-stone-300 text-sm">No note selected</p>
              <button
                type="button"
                onClick={handleStartNewNote}
                className="px-4 py-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Plus className="w-4 h-4" />
                <span>Create custom note</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
