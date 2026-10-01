'use client';

import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Layers, Compass, Settings, Moon, Sun, X, ArrowRight } from 'lucide-react';
import { Book } from '@/lib/db/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onNavigateTab: (tab: 'today' | 'library' | 'cards' | 'settings') => void;
  onSelectBook: (bookId: string) => void;
  onToggleTheme: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  books,
  onNavigateTab,
  onSelectBook,
  onToggleTheme,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredBooks = books.filter(b =>
    b.title.toLowerCase().includes(query.toLowerCase()) ||
    (b.author && b.author.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-stone-200 dark:border-stone-800 gap-3">
          <Search className="w-5 h-5 text-stone-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search books..."
            className="w-full bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {/* Main Navigation Targets */}
          <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-stone-400">
            Navigation
          </div>

          <button
            onClick={() => {
              onNavigateTab('today');
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg group text-left"
          >
            <div className="flex items-center gap-3">
              <Compass className="w-4 h-4 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200" />
              <span>Go to Today & Habit Loop</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-stone-400 opacity-0 group-hover:opacity-100" />
          </button>

          <button
            onClick={() => {
              onNavigateTab('library');
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg group text-left"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200" />
              <span>Go to Library</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-stone-400 opacity-0 group-hover:opacity-100" />
          </button>

          <button
            onClick={() => {
              onNavigateTab('cards');
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg group text-left"
          >
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200" />
              <span>Go to Flashcards & Reviews</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-stone-400 opacity-0 group-hover:opacity-100" />
          </button>

          <button
            onClick={() => {
              onNavigateTab('settings');
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg group text-left"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200" />
              <span>Settings & AI Providers</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-stone-400 opacity-0 group-hover:opacity-100" />
          </button>

          <button
            onClick={() => {
              onToggleTheme();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg group text-left"
          >
            <div className="flex items-center gap-3">
              <Sun className="w-4 h-4 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200" />
              <span>Toggle Dark / Light Theme</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-stone-400 opacity-0 group-hover:opacity-100" />
          </button>

          {/* Books in Library */}
          {filteredBooks.length > 0 && (
            <>
              <div className="px-2 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-stone-400">
                Books
              </div>
              {filteredBooks.map(book => (
                <button
                  key={book.id}
                  onClick={() => {
                    onSelectBook(book.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg group text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <BookOpen className="w-4 h-4 text-stone-400 shrink-0" />
                    <div className="truncate">
                      <span className="font-medium">{book.title}</span>
                      {book.author && (
                        <span className="text-xs text-stone-400 ml-2">by {book.author}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-stone-400 shrink-0">Open Reader →</span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Palette Footer */}
        <div className="px-4 py-2 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
          <span>Navigate with mouse or arrow keys</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
