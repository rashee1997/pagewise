'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';

export interface NoteDraft {
  quote: string;
  text: string;
}

interface NoteDialogProps {
  draft: NoteDraft | null;
  onChange: (draft: NoteDraft) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function NoteDialog({ draft, onChange, onCancel, onSubmit }: NoteDialogProps) {
  return (
    <Dialog
      isOpen={!!draft}
      onClose={onCancel}
      title="Add a note"
      panelClassName="w-full max-w-md bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 space-y-4"
    >
      {draft && (
        <>
          <blockquote className="border-l-2 border-amber-600 pl-3 text-sm italic text-stone-600 dark:text-stone-400 line-clamp-4">
            {draft.quote}
          </blockquote>
          <div className="space-y-1.5">
            <label htmlFor="note-text" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Your note
            </label>
            <textarea
              id="note-text"
              data-autofocus
              rows={4}
              value={draft.text}
              onChange={e => onChange({ ...draft, text: e.target.value })}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              className="w-full px-3 py-2 text-sm bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl resize-y"
              placeholder="Why does this matter?"
            />
            <p className="text-xs text-stone-600 dark:text-stone-400">Ctrl/⌘ + Enter to save</p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800">
              Cancel
            </button>
            <button
              onClick={onSubmit}
              className="px-4 py-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 text-xs font-semibold rounded-xl"
            >
              {draft.text.trim() ? 'Save note' : 'Save highlight'}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
