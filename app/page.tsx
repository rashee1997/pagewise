'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getAllBooks,
  getDueCards,
  getAppSettings,
  getTodayReadingSeconds,
  getChaptersForBook,
  getBookById,
} from '@/lib/db';
import { seedSampleBooksIfEmpty } from '@/lib/db/samples';
import { db, DEFAULT_SETTINGS } from '@/lib/db';
import { Book, Chapter, AppSettings } from '@/lib/db/types';

import { AppNavbar, ActiveTab } from '@/components/navigation/AppNavbar';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import { TodayView } from '@/components/today/TodayView';
import { LibraryView } from '@/components/library/LibraryView';
import { ReaderView } from '@/components/reader/ReaderView';
import { CardsView } from '@/components/cards/CardsView';
import { SettingsView } from '@/components/settings/SettingsView';
import { UploadModal } from '@/components/library/UploadModal';
import { motion, AnimatePresence } from 'motion/react';

export default function PagewiseApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [books, setBooks] = useState<Book[]>([]);
  const [dueCardsCount, setDueCardsCount] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Reader Mode state
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [activeChapters, setActiveChapters] = useState<Chapter[]>([]);

  // Modals & Panels
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [settings.theme]);

  const loadData = useCallback(async () => {
    try {
      await seedSampleBooksIfEmpty(db);
      const [fetchedBooks, fetchedDue, fetchedSettings, seconds] = await Promise.all([
        getAllBooks(),
        getDueCards(),
        getAppSettings(),
        getTodayReadingSeconds(),
      ]);

      setBooks(fetchedBooks);
      setDueCardsCount(fetchedDue.length);
      setSettings(fetchedSettings);
      setTodayMinutes(Math.round(seconds / 60));
    } catch (e) {
      console.error('Error loading Pagewise data:', e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        await seedSampleBooksIfEmpty(db);
        const [fetchedBooks, fetchedDue, fetchedSettings, seconds] = await Promise.all([
          getAllBooks(),
          getDueCards(),
          getAppSettings(),
          getTodayReadingSeconds(),
        ]);
        if (!ignore) {
          setBooks(fetchedBooks);
          setDueCardsCount(fetchedDue.length);
          setSettings(fetchedSettings);
          setTodayMinutes(Math.round(seconds / 60));
        }
      } catch (e) {
        console.error('Error loading Pagewise data:', e);
      } finally {
        if (!ignore) setIsInitialized(true);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // Open book in Reader
  const handleOpenBook = async (bookId: string) => {
    const book = await getBookById(bookId);
    if (!book) return;
    const chapters = await getChaptersForBook(bookId);
    if (chapters.length === 0) {
      alert('This book does not have chapters to read.');
      return;
    }
    setActiveBook(book);
    setActiveChapters(chapters);
    setActiveBookId(bookId);
  };

  const handleBackToLibrary = async () => {
    setActiveBookId(null);
    setActiveBook(null);
    setActiveChapters([]);
    await loadData();
  };

  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    setSettings(prev => ({ ...prev, theme: nextTheme }));
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-950 flex items-center justify-center font-bold text-sm tracking-tight animate-pulse">
          P
        </div>
      </div>
    );
  }

  // If in Reader view, render fullscreen reader
  if (activeBookId && activeBook && activeChapters.length > 0) {
    return (
      <ReaderView
        book={activeBook}
        chapters={activeChapters}
        initialChapterIndex={activeBook.progress.chapterIndex || 0}
        settings={settings}
        onUpdateSettings={partial => setSettings(prev => ({ ...prev, ...partial }))}
        onBackToLibrary={handleBackToLibrary}
        dueCardsCount={dueCardsCount}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col md:flex-row text-stone-900 dark:text-stone-100">
      {/* Desktop Sidebar & Mobile Bottom Navigation */}
      <AppNavbar
        activeTab={activeTab}
        onTabChange={tab => setActiveTab(tab)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        dueCardsCount={dueCardsCount}
      />

      {/* Main Screen Body */}
      <main className="flex-1 pb-20 md:pb-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'today' && (
            <motion.div
              key="today"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <TodayView
                books={books}
                dueCardsCount={dueCardsCount}
                todayMinutes={todayMinutes}
                settings={settings}
                onOpenBook={handleOpenBook}
                onStartReview={() => setActiveTab('cards')}
                onOpenUpload={() => setIsUploadOpen(true)}
                onUpdateSettings={s => setSettings(s)}
              />
            </motion.div>
          )}

          {activeTab === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <LibraryView
                books={books}
                onOpenBook={handleOpenBook}
                onOpenUpload={() => setIsUploadOpen(true)}
                onRefreshBooks={loadData}
              />
            </motion.div>
          )}

          {activeTab === 'cards' && (
            <motion.div
              key="cards"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <CardsView
                books={books}
                onOpenBook={handleOpenBook}
              />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <SettingsView
                settings={settings}
                onUpdateSettings={s => setSettings(s)}
                onResetApp={loadData}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={newBook => {
          loadData();
          handleOpenBook(newBook.id);
        }}
      />

      {/* Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        books={books}
        onNavigateTab={tab => setActiveTab(tab)}
        onSelectBook={handleOpenBook}
        onToggleTheme={handleToggleTheme}
      />
    </div>
  );
}
