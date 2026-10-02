'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Trash2, Quote, Plus, Pencil, Maximize2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Note } from '@/lib/db/types';
import { formatMarkdown } from '@/lib/reader/text';

interface NotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chapterTitle: string;
  notes: Note[];
  onDelete: (note: Note) => void;
  onJump: (note: Note) => void;
  onEdit: (note: Note) => void;
  onNewCustomNote: () => void;
  onOpenWorkspace: () => void;
  inline?: boolean;
}

export function NotesPanel({
  isOpen,
  onClose,
  chapterTitle,
  notes,
  onDelete,
  onJump,
  onEdit,
  onNewCustomNote,
  onOpenWorkspace,
  inline = false,
}: NotesPanelProps) {
  const content = (
    <>
      <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 shrink-0">
        <div className="min-w-0">
          <h3 className="text-sm font-bold">Highlights &amp; notes</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{chapterTitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenWorkspace}
            className="px-2.5 py-1.5 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition-colors"
            title="Open Fullscreen Notes & AI Workspace"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Workspace</span>
          </button>
          <button
            type="button"
            onClick={onNewCustomNote}
            className="px-2.5 py-1.5 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 rounded-xl text-xs font-semibold inline-flex items-center gap-1 shadow-xs hover:opacity-95"
            title="Add custom note"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Note</span>
          </button>
          <button
            data-autofocus
            onClick={onClose}
            aria-label="Close highlights and notes"
            className="p-2 -m-1 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-4">
        {notes.length === 0 ? (
          <div className="text-center py-12 space-y-3 text-sm text-stone-500 dark:text-stone-400">
            <p className="font-semibold text-stone-800 dark:text-stone-200">Nothing saved in this chapter yet</p>
            <p className="text-xs">Select text while reading to highlight or add a note, or click &ldquo;+ Note&rdquo; above to create a custom note.</p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={onNewCustomNote}
                className="px-3 py-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create custom note</span>
              </button>
              <button
                type="button"
                onClick={onOpenWorkspace}
                className="px-3 py-2 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Open Workspace</span>
              </button>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {notes.map(n => (
              <li key={n.id} className="rounded-xl border border-stone-200 dark:border-stone-800 p-3.5 space-y-2.5 bg-stone-50/50 dark:bg-stone-800/30">
                {n.quote && (
                  <button
                    type="button"
                    onClick={() => onJump(n)}
                    className="flex items-start gap-2 text-left text-xs italic text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 bg-amber-50/60 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/30 w-full"
                  >
                    <Quote className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    <span className="line-clamp-4">{n.quote}</span>
                  </button>
                )}
                {n.text && (
                  <div className="text-sm text-stone-900 dark:text-stone-100 prose prose-stone dark:prose-invert max-w-none">
                    <ReactMarkdown>{formatMarkdown(n.text)}</ReactMarkdown>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
                  <time dateTime={new Date(n.createdAt).toISOString()}>{new Date(n.createdAt).toLocaleDateString()}</time>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(n)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                      title="Edit note"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(n)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );

  if (inline) {
    if (!isOpen) return null;
    return (
      <aside aria-label="Notes side panel" className="w-full lg:w-96 shrink-0 border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col h-[calc(100vh-4rem)] sticky top-16 shadow-sm">
        {content}
      </aside>
    );
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Highlights and notes"
      hideTitle
      placement="right"
      panelClassName="w-full sm:w-96 h-full bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 text-stone-900 dark:text-stone-100"
    >
      {content}
    </Dialog>
  );
}
