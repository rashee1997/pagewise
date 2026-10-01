'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { RefreshCw, Copy, StickyNote } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import type { AiSelectionState } from '@/hooks/reader/useSelectionAI';

interface ExplainDialogProps {
  state: AiSelectionState | null;
  onClose: () => void;
  onRetry: (kind: AiSelectionState['kind'], text: string) => void;
  onSaveAsNote: (quote: string, content: string) => void;
}

const secondaryBtn =
  'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800';

/** Result of an Explain / Simplify request: skeleton with reserved height, Markdown, retry/copy/save. */
export function ExplainDialog({ state, onClose, onRetry, onSaveAsNote }: ExplainDialogProps) {
  const toast = useToast();

  return (
    <Dialog
      isOpen={!!state}
      onClose={onClose}
      title={state?.kind === 'simplify_selection' ? 'Simplified passage' : 'Contextual explanation'}
      panelClassName="w-full max-w-lg max-h-[85dvh] overflow-y-auto bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 space-y-4"
    >
      {state && (
        <>
          <blockquote className="border-l-2 border-amber-600 pl-3 text-sm italic text-stone-600 dark:text-stone-400 line-clamp-3">
            {state.text}
          </blockquote>

          <div className="min-h-32" aria-live="polite" aria-busy={state.status === 'loading'}>
            {state.status === 'loading' && (
              <div className="space-y-2.5 animate-pulse motion-reduce:animate-none" role="status">
                <span className="sr-only">Analyzing the selected passage…</span>
                {['w-full', 'w-11/12', 'w-4/5', 'w-2/3'].map(w => (
                  <div key={w} className={`h-3.5 bg-stone-200 dark:bg-stone-800 rounded ${w}`} />
                ))}
              </div>
            )}
            {state.status === 'done' && (
              <div className="prose prose-stone dark:prose-invert prose-sm max-w-none">
                <ReactMarkdown>{state.content}</ReactMarkdown>
              </div>
            )}
            {state.status === 'error' && (
              <p
                role="alert"
                className="text-sm text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-3"
              >
                {state.content}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            {state.status === 'error' && (
              <button onClick={() => onRetry(state.kind, state.text)} className={secondaryBtn}>
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Retry
              </button>
            )}
            {state.status === 'done' && (
              <>
                <button
                  onClick={() => navigator.clipboard?.writeText(state.content).then(() => toast({ message: 'Copied' }))}
                  className={secondaryBtn}
                >
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copy
                </button>
                <button onClick={() => onSaveAsNote(state.text, state.content)} className={secondaryBtn}>
                  <StickyNote className="w-3.5 h-3.5" aria-hidden="true" /> Save as note
                </button>
              </>
            )}
            <button
              data-autofocus
              onClick={onClose}
              className="px-4 py-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 text-xs font-semibold rounded-xl"
            >
              Done
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
