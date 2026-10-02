import { useEffect, useMemo, useState } from 'react';
import { Book, Chapter, Note } from '@/lib/db/types';
import { getNotesForBook, saveNote, deleteNote } from '@/lib/db';
import { normalizeQuote } from '@/lib/reader/text';
import { useToast } from '@/components/ui/Toast';

/** Persisted highlights and notes for a book, with optimistic updates and undo. */
export function useReaderNotes(book: Book, chapter: Chapter) {
  const toast = useToast();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    let ignore = false;
    getNotesForBook(book.id).then(list => {
      if (!ignore) setNotes(list);
    });
    return () => {
      ignore = true;
    };
  }, [book.id]);

  const chapterNotes = useMemo(() => notes.filter(n => n.chapterId === chapter.id), [notes, chapter.id]);
  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of notes) counts[n.chapterId] = (counts[n.chapterId] || 0) + 1;
    return counts;
  }, [notes]);

  const removeNote = async (note: Note, silent = false) => {
    setNotes(prev => prev.filter(n => n.id !== note.id));
    try {
      await deleteNote(note.id);
      if (!silent) {
        toast({
          message: 'Removed',
          actionLabel: 'Undo',
          onAction: async () => {
            setNotes(prev => [note, ...prev]);
            await saveNote(note);
          },
        });
      }
    } catch {
      setNotes(prev => [note, ...prev]);
    }
  };

  /** Save a highlight (no text) or a note (with text) for the quoted passage. */
  const addHighlight = async (text: string, noteText = '') => {
    const quote = normalizeQuote(text);
    if (!noteText && notes.some(n => n.chapterId === chapter.id && n.quote === quote && !n.text)) {
      toast({ message: 'Already highlighted' });
      return;
    }
    const note: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookId: book.id,
      chapterId: chapter.id,
      page: chapter.startPage,
      quote,
      text: noteText,
      createdAt: Date.now(),
    };
    setNotes(prev => [note, ...prev]); // optimistic
    try {
      await saveNote(note);
      toast({
        message: noteText ? 'Note saved' : 'Highlight saved',
        actionLabel: 'Undo',
        onAction: () => removeNote(note, true),
      });
    } catch {
      setNotes(prev => prev.filter(n => n.id !== note.id));
      toast({ message: 'Could not save — browser storage may be full.', tone: 'error' });
    }
  };

  /** Save or update a note, highlight, or custom note. */
  const saveNoteItem = async (draft: { id?: string; chapterId?: string; quote?: string; text: string }) => {
    const targetChapterId = draft.chapterId || chapter.id;
    const quote = draft.quote ? normalizeQuote(draft.quote) : undefined;
    if (draft.id) {
      const existing = notes.find(n => n.id === draft.id);
      if (!existing) return;
      const updated: Note = { ...existing, chapterId: targetChapterId, quote, text: draft.text };
      setNotes(prev => prev.map(n => (n.id === draft.id ? updated : n)));
      try {
        await saveNote(updated);
        toast({ message: 'Note updated' });
      } catch {
        toast({ message: 'Could not update note', tone: 'error' });
      }
    } else {
      if (!quote && !draft.text.trim()) return;
      const note: Note = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        bookId: book.id,
        chapterId: targetChapterId,
        page: chapter.startPage,
        quote,
        text: draft.text,
        createdAt: Date.now(),
      };
      setNotes(prev => [note, ...prev]); // optimistic
      try {
        await saveNote(note);
        toast({
          message: draft.text ? 'Note saved' : 'Highlight saved',
          actionLabel: 'Undo',
          onAction: () => removeNote(note, true),
        });
      } catch {
        setNotes(prev => prev.filter(n => n.id !== note.id));
        toast({ message: 'Could not save — browser storage may be full.', tone: 'error' });
      }
    }
  };

  return { notes, chapterNotes, noteCounts, addHighlight, saveNoteItem, removeNote };
}
