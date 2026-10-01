'use client';

import React from 'react';
import { X, Trash2, Quote } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Note } from '@/lib/db/types';

interface NotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chapterTitle: string;
  notes: Note[];
  onDelete: (note: Note) => void;
  onJump: (note: Note) => void;
}

export function NotesPanel({ isOpen, onClose, chapterTitle, notes, onDelete, onJump }: NotesPanelProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Highlights and notes"
      hideTitle
      placement="right"
      panelClassName="w-full sm:w-96 h-full bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 text-stone-900 dark:text-stone-100"
    >
      <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 shrink-0">
        <div className="min-w-0">
          <h3 className="text-sm font-bold">Highlights &amp; notes</h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 truncate">{chapterTitle}</p>
        </div>
        <button
          data-autofocus
          onClick={onClose}
          aria-label="Close highlights and notes"
          className="p-2 -m-1 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-4">
        {notes.length === 0 ? (
          <div className="text-center py-12 space-y-2 text-sm text-stone-600 dark:text-stone-400">
            <p className="font-semibold text-stone-800 dark:text-stone-200">Nothing saved in this chapter yet</p>
            <p>Select text while reading, then choose Highlight (H) or Note (N).</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {notes.map(n => (
              <li key={n.id} className="rounded-xl border border-stone-200 dark:border-stone-800 p-3 space-y-2">
                {n.quote && (
                  <button
                    onClick={() => onJump(n)}
                    className="flex items-start gap-2 text-left text-sm italic text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100"
                  >
                    <Quote className="w-3.5 h-3.5 mt-1 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                    <span className="line-clamp-4">{n.quote}</span>
                  </button>
                )}
                {n.text && <p className="text-sm text-stone-900 dark:text-stone-100 whitespace-pre-line">{n.text}</p>}
                <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                  <time dateTime={new Date(n.createdAt).toISOString()}>{new Date(n.createdAt).toLocaleDateString()}</time>
                  <button
                    onClick={() => onDelete(n)}
                    className="inline-flex items-center gap-1 px-2 py-1.5 -m-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-700 dark:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
