'use client';

import React, { RefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import { formatMarkdown } from '@/lib/reader/text';
import { Note } from '@/lib/db/types';

interface NoteMarkdownEditorProps {
  isEditing: boolean;
  activeNote: Note | null;
  activeTab: 'write' | 'preview';
  quote: string;
  text: string;
  onTextChange: (newText: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onInsertMarkdown: (before: string, after?: string, defaultText?: string) => void;
}

export function NoteMarkdownEditor({
  isEditing,
  activeNote,
  activeTab,
  quote,
  text,
  onTextChange,
  textareaRef,
  onInsertMarkdown,
}: NoteMarkdownEditorProps) {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-3">
      {/* Quote Box (if any) */}
      {!isEditing && activeNote?.quote && (
        <blockquote className="border-l-2 border-amber-600 pl-3.5 py-1.5 text-xs sm:text-sm italic text-stone-700 dark:text-stone-300 bg-amber-50/50 dark:bg-amber-950/20 rounded-r-xl">
          &ldquo;{activeNote.quote}&rdquo;
        </blockquote>
      )}

      {isEditing && quote && (
        <blockquote className="border-l-2 border-amber-600 pl-3.5 py-1.5 text-xs sm:text-sm italic text-stone-700 dark:text-stone-300 bg-amber-50/50 dark:bg-amber-950/20 rounded-r-xl">
          &ldquo;{quote}&rdquo;
        </blockquote>
      )}

      {isEditing ? (
        <div className="flex-1 flex flex-col space-y-2.5">
          {activeTab === 'write' && (
            <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shrink-0">
              <button
                type="button"
                onClick={() => onInsertMarkdown('**', '**', 'bold')}
                className="px-2 py-1 text-xs font-semibold rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Bold
              </button>
              <button
                type="button"
                onClick={() => onInsertMarkdown('*', '*', 'italic')}
                className="px-2 py-1 text-xs font-semibold rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Italic
              </button>
              <button
                type="button"
                onClick={() => onInsertMarkdown('### ', '', 'Heading')}
                className="px-2 py-1 text-xs font-semibold rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => onInsertMarkdown('- ', '', 'Item')}
                className="px-2 py-1 text-xs font-semibold rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                List
              </button>
            </div>
          )}

          {activeTab === 'write' ? (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => onTextChange(e.target.value)}
              placeholder="Write your note freely in markdown..."
              rows={10}
              className="w-full flex-1 px-3.5 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-xs sm:text-sm font-mono focus-visible:ring-2 focus-visible:ring-amber-500 resize-y text-stone-900 dark:text-stone-100"
            />
          ) : (
            <div className="flex-1 w-full p-4 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl overflow-y-auto prose prose-stone dark:prose-invert max-w-none text-xs sm:text-sm">
              <ReactMarkdown>{formatMarkdown(text)}</ReactMarkdown>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 p-4 sm:p-6 bg-stone-50/50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-y-auto prose prose-stone dark:prose-invert max-w-none text-xs sm:text-sm">
          {activeNote?.text ? (
            <ReactMarkdown>{formatMarkdown(activeNote.text)}</ReactMarkdown>
          ) : (
            <p className="text-stone-500 dark:text-stone-400 italic">No note text provided for this highlight.</p>
          )}
        </div>
      )}
    </div>
  );
}
