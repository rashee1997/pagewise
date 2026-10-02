'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { Note, Chapter } from '@/lib/db/types';

interface NotesSidebarListProps {
  notes: Note[];
  filteredNotes: Note[];
  chapters: Chapter[];
  selectedChapterId: string;
  onSelectChapterId: (id: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  activeNoteId: string | null;
  onSelectNote: (note: Note) => void;
  mobileShowEditor: boolean;
}

export function NotesSidebarList({
  notes,
  filteredNotes,
  chapters,
  selectedChapterId,
  onSelectChapterId,
  searchQuery,
  onSearchQueryChange,
  activeNoteId,
  onSelectNote,
  mobileShowEditor,
}: NotesSidebarListProps) {
  return (
    <div
      className={`w-full sm:w-80 border-r border-stone-200 dark:border-stone-800 flex flex-col bg-stone-50/40 dark:bg-stone-900/30 shrink-0 ${
        mobileShowEditor ? 'hidden sm:flex' : 'flex'
      }`}
    >
      {/* Search & Chapter Filter */}
      <div className="p-3 space-y-2 border-b border-stone-200 dark:border-stone-800 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500 dark:text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus-visible:ring-2 focus-visible:ring-amber-500 text-stone-900 dark:text-stone-100"
          />
        </div>

        <select
          value={selectedChapterId}
          onChange={e => onSelectChapterId(e.target.value)}
          aria-label="Filter notes by chapter"
          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus-visible:ring-2 focus-visible:ring-amber-500 text-stone-900 dark:text-stone-100 cursor-pointer"
        >
          <option value="all">All Chapters ({notes.length})</option>
          {chapters.map(c => {
            const count = notes.filter(n => n.chapterId === c.id).length;
            return (
              <option key={c.id} value={c.id}>
                {c.title} ({count})
              </option>
            );
          })}
        </select>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2" role="feed" aria-label="Notes list">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-xs text-stone-500 dark:text-stone-400">No notes found</div>
        ) : (
          filteredNotes.map(n => {
            const isSelected = activeNoteId === n.id;
            const chap = chapters.find(c => c.id === n.chapterId);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => onSelectNote(n)}
                className={`w-full text-left p-3 rounded-xl border transition-all space-y-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  isSelected
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-xs'
                    : 'bg-white dark:bg-stone-800/60 border-stone-200 dark:border-stone-700/60 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span className="truncate font-medium">{chap?.title || 'Chapter'}</span>
                  <time dateTime={new Date(n.createdAt).toISOString()}>{new Date(n.createdAt).toLocaleDateString()}</time>
                </div>
                {n.quote && (
                  <p className="text-xs italic text-stone-600 dark:text-stone-400 line-clamp-1">
                    &ldquo;{n.quote}&rdquo;
                  </p>
                )}
                <p className="text-xs text-stone-900 dark:text-stone-100 line-clamp-2 font-medium">
                  {n.text || '(Highlight only)'}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
