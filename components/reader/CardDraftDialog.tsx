'use client';

import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import type { CardDraft } from '@/hooks/reader/useCardDraft';

interface CardDraftDialogProps {
  draft: CardDraft | null;
  onChange: (draft: CardDraft) => void;
  onCancel: () => void;
  onSubmit: () => void;
  onDraftQuestion: () => void;
}

const field =
  'w-full px-3 py-2 text-sm bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl resize-y';
const label = 'text-xs font-semibold text-stone-700 dark:text-stone-300';

export function CardDraftDialog({ draft, onChange, onCancel, onSubmit, onDraftQuestion }: CardDraftDialogProps) {
  return (
    <Dialog
      isOpen={!!draft}
      onClose={onCancel}
      title="Create flashcard"
      panelClassName="w-full max-w-md bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 max-h-[90dvh] overflow-y-auto"
    >
      {draft && (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="card-front" className={label}>
                Question
              </label>
              <button
                onClick={onDraftQuestion}
                disabled={draft.drafting}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-60"
              >
                {draft.drafting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                {draft.drafting ? 'Drafting…' : 'Draft with AI'}
              </button>
            </div>
            <textarea
              id="card-front"
              data-autofocus
              rows={2}
              value={draft.front}
              onChange={e => onChange({ ...draft, front: e.target.value })}
              placeholder="What do you want to remember?"
              className={field}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="card-back" className={label}>
              Answer
            </label>
            <textarea id="card-back" rows={4} value={draft.back} onChange={e => onChange({ ...draft, back: e.target.value })} className={field} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800">
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!draft.front.trim() || !draft.back.trim()}
              className="px-4 py-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 text-xs font-semibold rounded-xl disabled:opacity-40"
            >
              Add to deck
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
