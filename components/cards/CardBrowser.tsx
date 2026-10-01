'use client';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import React, { useState } from 'react';
import { FlashCard, Book } from '@/lib/db/types';
import { deleteCard, saveCards } from '@/lib/db';
import { generateFingerprint } from '@/lib/study/dedupe';
import { createInitialFsrsState } from '@/lib/study/fsrs';
import { Search, Plus, Trash2, X, Layers, Filter } from 'lucide-react';

interface CardBrowserProps {
  cards: FlashCard[];
  books: Book[];
  onRefreshCards: () => void;
}

export function CardBrowser({ cards, books, onRefreshCards }: CardBrowserProps) {
  const [now] = useState(() => Date.now());
  const [search, setSearch] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New card modal form state
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newHint, setNewHint] = useState('');
  const [newBookId, setNewBookId] = useState(books[0]?.id || '');

  const filtered = cards.filter(c => {
    const matchesBook = selectedBookId === 'all' || c.bookId === selectedBookId;
    const matchesSearch =
      c.front.toLowerCase().includes(search.toLowerCase()) ||
      c.back.toLowerCase().includes(search.toLowerCase()) ||
      c.conceptKey.toLowerCase().includes(search.toLowerCase());
    return matchesBook && matchesSearch;
  });

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDelete = (cardId: string) => setPendingDeleteId(cardId);

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    await deleteCard(id);
    onRefreshCards();
  };

  const handleToggleSuspend = async (card: FlashCard) => {
    const updated = { ...card, suspended: !card.suspended };
    await saveCards([updated]);
    onRefreshCards();
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim() || !newBookId) return;

    const chosenBook = books.find(b => b.id === newBookId);
    const newCard: FlashCard = {
      id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookId: newBookId,
      chapterId: 'manual',
      chapterTitle: chosenBook?.title || 'Manual Card',
      type: 'concept',
      front: newFront.trim(),
      back: newBack.trim(),
      hint: newHint.trim() || undefined,
      conceptKey: 'custom-card',
      fingerprint: generateFingerprint(newFront),
      fsrs: createInitialFsrsState(),
      createdAt: Date.now(),
    };

    await saveCards([newCard]);
    setNewFront('');
    setNewBack('');
    setNewHint('');
    setIsAddModalOpen(false);
    onRefreshCards();
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-stone-600 dark:text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search front, back, or concept..."
              className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-hidden"
            />
          </div>

          {/* Book Filter */}
          <select
            value={selectedBookId}
            onChange={e => setSelectedBookId(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-700 dark:text-stone-300"
          >
            <option value="all">All Books ({cards.length})</option>
            {books.map(b => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-semibold rounded-xl shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Card</span>
        </button>
      </div>

      {/* Cards List */}
      {filtered.length > 0 ? (
        <div className="grid gap-3">
          {filtered.map(card => {
            const isDue = card.fsrs.due <= now;
            return (
              <div
                key={card.id}
                className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xs space-y-2 relative group"
              >
                <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 font-medium">
                  <div className="flex items-center gap-2">
                    <span>{card.chapterTitle || 'Deck Card'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-stone-600 dark:text-stone-400">{card.conceptKey}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {card.suspended ? (
                      <span className="text-xs font-semibold text-stone-600 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md">
                        Suspended
                      </span>
                    ) : isDue ? (
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                        Due Now
                      </span>
                    ) : (
                      <span className="text-xs text-stone-600 dark:text-stone-400">
                        Scheduled
                      </span>
                    )}

                    <button
                      onClick={() => handleToggleSuspend(card)}
                      className="text-xs text-stone-600 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 px-1.5 py-0.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      {card.suspended ? 'Unsuspend' : 'Suspend'}
                    </button>

                    <button
                      onClick={() => handleDelete(card.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-stone-600 dark:text-stone-400 hover:text-red-600 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {card.front}
                </p>

                <p className="text-xs text-stone-600 dark:text-stone-400 whitespace-pre-line pt-1 border-t border-stone-100 dark:border-stone-800/80">
                  {card.back}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-stone-600 dark:text-stone-400">
          No flashcards match your current filter.
        </div>
      )}

      {/* Create Card Modal */}
      {isAddModalOpen && (
        <div
          onClick={() => setIsAddModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-2xs"
        >
          <form
            onSubmit={handleCreateCard}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Create Flashcard
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-md text-stone-600 dark:text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-stone-300">Book Deck</label>
              <select
                value={newBookId}
                onChange={e => setNewBookId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800"
              >
                {books.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-stone-300">Front (Question / Prompt)</label>
              <textarea
                required
                rows={2}
                value={newFront}
                onChange={e => setNewFront(e.target.value)}
                placeholder="What is the definition of..."
                className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-stone-300">Back (Answer)</label>
              <textarea
                required
                rows={3}
                value={newBack}
                onChange={e => setNewBack(e.target.value)}
                placeholder="Key concept and reasoning..."
                className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-stone-300">Hint (Optional)</label>
              <input
                type="text"
                value={newHint}
                onChange={e => setNewHint(e.target.value)}
                placeholder="Mnemonic or clue..."
                className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 font-semibold rounded-xl"
              >
                Save Card
              </button>
            </div>
          </form>
        </div>
      )}
      <ConfirmDialog
        isOpen={!!pendingDeleteId}
        title="Delete this card?"
        description="It will be removed from your deck and its review history will no longer count."
        confirmLabel="Delete card"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
