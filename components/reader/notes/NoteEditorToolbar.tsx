'use client';

import React from 'react';
import { ArrowLeft, Pencil, Edit3, Eye, Save, Trash2 } from 'lucide-react';
import { Note, Chapter } from '@/lib/db/types';

interface NoteEditorToolbarProps {
  chapters: Chapter[];
  chapterId: string;
  isEditing: boolean;
  activeNote: Note | null;
  activeTab: 'write' | 'preview';
  onSetActiveTab: (tab: 'write' | 'preview') => void;
  onStartEdit: () => void;
  onSave: () => void;
  onDeleteNote: (note: Note) => void;
  onBackToList: () => void;
}

export function NoteEditorToolbar({
  chapters,
  chapterId,
  isEditing,
  activeNote,
  activeTab,
  onSetActiveTab,
  onStartEdit,
  onSave,
  onDeleteNote,
  onBackToList,
}: NoteEditorToolbarProps) {
  const currentChapter = chapters.find(c => c.id === chapterId);

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onBackToList}
          className="sm:hidden p-1.5 -ml-1 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg focus-visible:ring-2 focus-visible:ring-amber-500"
          title="Back to notes list"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold px-2 py-0.5 bg-stone-200 dark:bg-stone-800 rounded-md text-stone-700 dark:text-stone-300 truncate max-w-44">
          {currentChapter?.title || 'Chapter'}
        </span>
        {!isEditing && activeNote && (
          <button
            type="button"
            onClick={onStartEdit}
            className="px-2.5 py-1 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 rounded-xl text-xs font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Pencil className="w-3 h-3" />
            <span>Edit</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <div className="hidden sm:flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl" role="tablist" aria-label="Editor view mode">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'write'}
                onClick={() => onSetActiveTab('write')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  activeTab === 'write'
                    ? 'bg-white dark:bg-stone-700 shadow-xs text-stone-900 dark:text-stone-100 font-semibold'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Write</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'preview'}
                onClick={() => onSetActiveTab('preview')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-stone-700 shadow-xs text-stone-900 dark:text-stone-100 font-semibold'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Preview</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onSave}
              className="px-3.5 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm hover:bg-amber-700 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </>
        ) : (
          activeNote && (
            <button
              type="button"
              onClick={() => onDeleteNote(activeNote)}
              className="px-2.5 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
