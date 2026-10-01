'use client';

import React, { useState } from 'react';
import { Book } from '@/lib/db/types';
import { Plus, BookOpen, Trash2, MoreVertical, Search, Sparkles } from 'lucide-react';
import { deleteBookCascade } from '@/lib/db';
import { seedSampleBooksIfEmpty } from '@/lib/db/samples';
import { db } from '@/lib/db';

interface LibraryViewProps {
  books: Book[];
  onOpenBook: (bookId: string) => void;
  onOpenUpload: () => void;
  onRefreshBooks: () => void;
}

export function LibraryView({
  books,
  onOpenBook,
  onOpenUpload,
  onRefreshBooks,
}: LibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuBookId, setActiveMenuBookId] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<{ bookId: string; title: string; timerId: NodeJS.Timeout } | null>(null);

  const filteredBooks = books.filter(b => {
    if (undoState && b.id === undoState.bookId) return false;
    return (
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.author && b.author.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleDeleteBook = (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuBookId(null);

    // If another book was pending deletion, execute it immediately
    if (undoState) {
      clearTimeout(undoState.timerId);
      deleteBookCascade(undoState.bookId);
    }

    const timer = setTimeout(async () => {
      await deleteBookCascade(book.id);
      setUndoState(null);
      onRefreshBooks();
    }, 6000);

    setUndoState({
      bookId: book.id,
      title: book.title,
      timerId: timer,
    });
  };

  const handleUndoDelete = () => {
    if (undoState) {
      clearTimeout(undoState.timerId);
      setUndoState(null);
    }
  };

  const handleSeedSamples = async () => {
    await seedSampleBooksIfEmpty(db);
    onRefreshBooks();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Library
          </h1>
          <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400">
            {books.length} {books.length === 1 ? 'Book' : 'Books'} in your local library
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search books..."
              className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-hidden focus:border-stone-400 dark:focus:border-stone-600 shadow-2xs"
            />
          </div>

          {/* Primary Action Button */}
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs md:text-sm font-semibold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Book</span>
          </button>
        </div>
      </div>

      {/* Book Grid */}
      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredBooks.map(book => {
            const isMenuOpen = activeMenuBookId === book.id;
            return (
              <div
                key={book.id}
                onClick={() => onOpenBook(book.id)}
                className="group bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative"
              >
                {/* Book Cover Area */}
                <div className="aspect-3/4 relative overflow-hidden bg-stone-100 dark:bg-stone-800 flex items-center justify-center border-b border-stone-100 dark:border-stone-800/80">
                  {book.coverDataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={book.coverDataUrl}
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                    />
                  ) : (
                    /* Elegant generated typographic cover */
                    <div className="p-6 text-center flex flex-col justify-center items-center h-full w-full bg-linear-to-b from-stone-100 to-stone-200 dark:from-stone-900 dark:to-stone-800">
                      <BookOpen className="w-8 h-8 text-stone-400 mb-3" />
                      <h3 className="font-serif font-bold text-sm md:text-base text-stone-900 dark:text-stone-100 line-clamp-3 leading-snug">
                        {book.title}
                      </h3>
                      {book.author && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 line-clamp-1 italic font-serif">
                          {book.author}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Context Menu Button */}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setActiveMenuBookId(isMenuOpen ? null : book.id);
                      }}
                      className="w-8 h-8 rounded-full bg-white/90 dark:bg-stone-900/90 backdrop-blur-xs text-stone-600 dark:text-stone-300 flex items-center justify-center hover:text-stone-900 dark:hover:text-white shadow-xs"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="absolute right-0 mt-1 w-36 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-lg p-1 z-20 space-y-0.5 text-xs animate-in fade-in"
                      >
                        <button
                          onClick={() => {
                            setActiveMenuBookId(null);
                            onOpenBook(book.id);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium"
                        >
                          Open Reader
                        </button>
                        <button
                          onClick={e => handleDeleteBook(book, e)}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1.5 font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Book Details */}
                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                      {book.author ? `by ${book.author}` : `${book.pageCount} pages`}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>{book.chapterCount} chapters</span>
                      <span>{book.progress.percent}% read</span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-stone-900 dark:bg-stone-100 h-full rounded-full transition-all"
                        style={{ width: `${Math.max(3, book.progress.percent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 text-center space-y-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              {searchQuery ? 'No matching books found' : 'Your Library is empty'}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Upload any PDF book or study notes, or explore our starter classic collection.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenUpload}
              className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
            >
              Upload PDF
            </button>
            <button
              onClick={handleSeedSamples}
              className="w-full sm:w-auto px-4 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-medium rounded-xl transition-colors cursor-pointer"
            >
              Load Sample Classics
            </button>
          </div>
        </div>
      )}

      {/* Undo Delete Toast Banner */}
      {undoState && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 px-4 py-3 rounded-2xl shadow-xl text-xs animate-in slide-in-from-bottom-2">
          <span>Deleted &ldquo;{undoState.title}&rdquo;</span>
          <button
            onClick={handleUndoDelete}
            className="px-2.5 py-1 bg-amber-400 text-stone-950 rounded-lg font-bold hover:bg-amber-300 transition-colors"
          >
            Undo (6s)
          </button>
        </div>
      )}
    </div>
  );
}
