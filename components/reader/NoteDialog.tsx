'use client';

import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { Bold, Italic, Heading3, List, ListOrdered, Quote as QuoteIcon, Code, Link as LinkIcon, Sparkles, Eye, Edit3, Loader2 } from 'lucide-react';
import { AppSettings, FlashCard } from '@/lib/db/types';
import { createInitialFsrsState } from '@/lib/study/fsrs';
import { formatMarkdown } from '@/lib/reader/text';

export interface NoteDraft {
  id?: string;
  quote?: string;
  text: string;
}

interface NoteDialogProps {
  draft: NoteDraft | null;
  onChange: (draft: NoteDraft) => void;
  onCancel: () => void;
  onSubmit: () => void;
  bookTitle?: string;
  chapterTitle?: string;
  chapterText?: string;
  settings?: AppSettings;
  bookId?: string;
  chapterId?: string;
  onFlashcardCreated?: (card: FlashCard) => void;
}

export function NoteDialog({
  draft,
  onChange,
  onCancel,
  onSubmit,
  bookTitle,
  chapterTitle,
  chapterText,
  settings,
  bookId = 'book_current',
  chapterId = 'chap_current',
  onFlashcardCreated,
}: NoteDialogProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (before: string, after: string = '', defaultText: string = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea || !draft) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = draft.text;
    const selected = value.substring(start, end) || defaultText;
    const newValue = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange({ ...draft, text: newValue });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const runAiAction = async (task: string) => {
    if (!draft) return;
    setIsAiLoading(true);
    setAiMenuOpen(false);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'note_ai',
          bookTitle,
          chapterTitle,
          chapterText,
          selectedText: draft.text || draft.quote || '',
          userPrompt: task,
          provider: settings?.provider,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'AI request failed');
      if (data.text) {
        const appended = draft.text ? `${draft.text}\n\n${data.text}` : data.text;
        onChange({ ...draft, text: appended });
        toast({ message: 'AI insights added to note' });
      }
    } catch (e: any) {
      toast({ message: e?.message || 'AI request failed', tone: 'error' });
    } finally {
      setIsAiLoading(false);
    }
  };

  const generateFlashcard = async () => {
    if (!draft || !draft.text.trim()) return;
    setIsAiLoading(true);
    setAiMenuOpen(false);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'cards',
          bookTitle,
          chapterTitle,
          chapterText,
          selectedText: draft.text,
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
          bookId,
          chapterId,
          chapterTitle: chapterTitle || 'Chapter',
          type: c.type || 'concept',
          front: c.front,
          back: c.back,
          hint: c.hint,
          conceptKey: c.conceptKey || `note-fc-${Date.now()}`,
          fingerprint: `fp_${Date.now()}`,
          fsrs: createInitialFsrsState(),
          createdAt: Date.now(),
        };
        onFlashcardCreated?.(newCard);
        toast({ message: '✨ Flashcard created successfully and added to your study deck!' });
      }
    } catch (e: any) {
      toast({ message: e?.message || 'Failed to generate flashcard', tone: 'error' });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={!!draft}
      onClose={onCancel}
      title={draft?.id ? 'Edit note' : draft?.quote ? 'Add a note' : 'New custom note'}
      panelClassName="w-full max-w-xl bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4"
    >
      {draft && (
        <>
          {draft.quote && (
            <blockquote className="border-l-2 border-amber-600 pl-3 text-sm italic text-stone-600 dark:text-stone-400 line-clamp-4 bg-amber-50/50 dark:bg-amber-950/20 py-1.5 rounded-r-lg">
              {draft.quote}
            </blockquote>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="note-text" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Note content (Markdown supported)
              </label>
              <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1 transition-colors ${
                    activeTab === 'write' ? 'bg-white dark:bg-stone-700 shadow-xs text-stone-900 dark:text-stone-100' : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Write</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1 transition-colors ${
                    activeTab === 'preview' ? 'bg-white dark:bg-stone-700 shadow-xs text-stone-900 dark:text-stone-100' : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {activeTab === 'write' && (
              <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700">
                <button
                  type="button"
                  title="Bold"
                  onClick={() => insertMarkdown('**', '**', 'bold text')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Italic"
                  onClick={() => insertMarkdown('*', '*', 'italic text')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Heading 3"
                  onClick={() => insertMarkdown('### ', '', 'Heading')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                >
                  <Heading3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Bullet List"
                  onClick={() => insertMarkdown('- ', '', 'List item')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Numbered List"
                  onClick={() => insertMarkdown('1. ', '', 'List item')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Blockquote"
                  onClick={() => insertMarkdown('> ', '', 'Quote')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                >
                  <QuoteIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Code block"
                  onClick={() => insertMarkdown('`', '`', 'code')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                >
                  <Code className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Link"
                  onClick={() => insertMarkdown('[', '](https://)', 'link text')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            {activeTab === 'write' ? (
              <textarea
                ref={textareaRef}
                id="note-text"
                data-autofocus
                rows={6}
                value={draft.text}
                onChange={e => onChange({ ...draft, text: e.target.value })}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl resize-y font-mono"
                placeholder="Write your note with markdown (e.g. **bold**, # heading, - list)..."
              />
            ) : (
              <div className="w-full min-h-[140px] px-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl overflow-y-auto prose prose-stone dark:prose-invert max-w-none text-sm">
                {draft.text.trim() ? (
                  <ReactMarkdown>{formatMarkdown(draft.text)}</ReactMarkdown>
                ) : (
                  <p className="text-stone-400 italic">Nothing to preview yet.</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAiMenuOpen(o => !o)}
                  disabled={isAiLoading}
                  className="px-3 py-1.5 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                  <span>AI Assist</span>
                </button>

                {aiMenuOpen && (
                  <div className="absolute left-0 bottom-full mb-2 w-56 bg-white dark:bg-stone-800 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 py-1.5 z-(--z-modal) text-xs space-y-0.5 animate-in fade-in-50 zoom-in-95">
                    <button
                      type="button"
                      onClick={() => runAiAction('Summarize and condense this note clearly with key takeaways.')}
                      className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2 font-medium"
                    >
                      ✨ Summarize note
                    </button>
                    <button
                      type="button"
                      onClick={() => runAiAction('Elaborate, add depth, and explain implications of this note.')}
                      className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2 font-medium"
                    >
                      💡 Expand & elaborate
                    </button>
                    <button
                      type="button"
                      onClick={() => runAiAction('Fix grammar, spelling, and polish into a clean, eloquent markdown note.')}
                      className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2 font-medium"
                    >
                      ✍️ Polish & fix grammar
                    </button>
                    <button
                      type="button"
                      onClick={generateFlashcard}
                      className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300 border-t border-stone-100 dark:border-stone-700"
                    >
                      🧠 Generate Flashcard
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-400">Ctrl/⌘ + Enter to save</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800">
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="px-4 py-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 text-xs font-semibold rounded-xl shadow-sm hover:opacity-95"
            >
              {draft.id ? 'Save changes' : draft.text.trim() ? 'Save note' : 'Save highlight'}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
