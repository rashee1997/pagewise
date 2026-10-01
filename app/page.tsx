'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  updateAppSettings,
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
import { TodayView } from '@/components/today/TodayView';
import { LibraryView } from '@/components/library/LibraryView';
import { ReaderView } from '@/components/reader/ReaderView';
import { CardsView } from '@/components/cards/CardsView';
import { SettingsView } from '@/components/settings/SettingsView';
import { UploadModal } from '@/components/library/UploadModal';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { ShortcutsDialog } from '@/components/navigation/ShortcutsDialog';
import { CommandPalette, Command } from '@/components/navigation/CommandPalette';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useLocalStorageFlag } from '@/hooks/useLocalStorageFlag';
import { BookOpen, Layers, Compass, Settings, Moon, Plus, Keyboard } from 'lucide-react';

export default function PagewiseApp() {
  return (
    <ToastProvider>
      <PagewiseShell />
    </ToastProvider>
  );
}

function isTypingTarget(el: EventTarget | null) {
  const node = el as HTMLElement | null;
  if (!node || !node.tagName) return false;
  return node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName);
}

function PagewiseShell() {
  const toast = useToast();
  const reduceMotion = useReducedMotion();
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
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [onboarded, setOnboarded] = useLocalStorageFlag('pagewise_onboarded');
  const [readerCommands, setReaderCommands] = useState<Command[]>([]);
  const [assistantSeed, setAssistantSeed] = useState<string | null>(null);

  // Sync theme (and mirror to localStorage so the pre-paint script in layout.tsx can read it)
  useEffect(() => {
    const root = document.documentElement;
    try {
      localStorage.setItem('pagewise_theme', settings.theme);
    } catch {
      // storage unavailable
    }
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && mql.matches);
      root.classList.toggle('dark', dark);
    };
    apply();
    if (settings.theme === 'system') {
      mql.addEventListener('change', apply);
      return () => mql.removeEventListener('change', apply);
    }
  }, [settings.theme]);

  // Global shortcuts: Ctrl/⌘+K toggles the command menu, "?" opens shortcut help
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(open => !open);
        return;
      }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
      toast({ message: 'This book has no readable chapters.', tone: 'error' });
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

  const persistSettings = useCallback(async (partial: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
    try {
      const updated = await updateAppSettings(partial);
      setSettings(updated);
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, []);

  const handleToggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    persistSettings({ theme: isDark ? 'light' : 'dark' });
  };

  const navigateTo = (tab: ActiveTab) => {
    if (activeBookId) {
      handleBackToLibrary().then(() => setActiveTab(tab));
    } else {
      setActiveTab(tab);
    }
  };

  const pageMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.01 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
      };

  const commands: Command[] = [
    ...readerCommands,
    { id: 'nav-today', group: 'Go to', label: 'Today', icon: <Compass className="w-4 h-4" />, run: () => navigateTo('today') },
    { id: 'nav-library', group: 'Go to', label: 'Library', icon: <BookOpen className="w-4 h-4" />, run: () => navigateTo('library') },
    { id: 'nav-cards', group: 'Go to', label: 'Flashcards & reviews', icon: <Layers className="w-4 h-4" />, keywords: 'review study', run: () => navigateTo('cards') },
    { id: 'nav-settings', group: 'Go to', label: 'Settings & AI providers', icon: <Settings className="w-4 h-4" />, keywords: 'api key model', run: () => navigateTo('settings') },
    { id: 'act-add', group: 'Actions', label: 'Add a book (PDF)', icon: <Plus className="w-4 h-4" />, keywords: 'upload import', run: () => setIsUploadOpen(true) },
    { id: 'act-theme', group: 'Actions', label: 'Toggle dark / light theme', icon: <Moon className="w-4 h-4" />, run: handleToggleTheme },
    { id: 'act-keys', group: 'Actions', label: 'Keyboard shortcuts', icon: <Keyboard className="w-4 h-4" />, shortcut: '?', run: () => setIsShortcutsOpen(true) },
    ...books.map<Command>(b => ({
      id: `book-${b.id}`,
      group: 'Books',
      label: b.title,
      detail: b.author,
      icon: <BookOpen className="w-4 h-4" />,
      keywords: 'open read',
      run: () => handleOpenBook(b.id),
    })),
  ];

  const overlays = (
    <>
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
        onNoResultsAction={
          activeBookId
            ? q => setAssistantSeed(q)
            : undefined
        }
      />
      <ShortcutsDialog isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <OnboardingModal
        isOpen={!onboarded}
        onClose={() => setOnboarded(true)}
        onGetStarted={() => setIsUploadOpen(true)}
      />
    </>
  );

  if (!isInitialized) {
    return (
      <div className="min-h-dvh bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-950 flex items-center justify-center font-bold text-sm tracking-tight animate-pulse">
          P
        </div>
      </div>
    );
  }

  // If in Reader view, render fullscreen reader
  if (activeBookId && activeBook && activeChapters.length > 0) {
    return (
      <>
      <ReaderView
        book={activeBook}
        chapters={activeChapters}
        initialChapterIndex={activeBook.progress.chapterIndex || 0}
        settings={settings}
        onUpdateSettings={persistSettings}
        onBackToLibrary={handleBackToLibrary}
        dueCardsCount={dueCardsCount}
        onRegisterCommands={setReaderCommands}
        assistantSeed={assistantSeed}
        onAssistantSeedConsumed={() => setAssistantSeed(null)}
      />
      {overlays}
      </>
    );
  }

  return (
    <div className="min-h-dvh bg-stone-50 dark:bg-stone-950 flex flex-col md:flex-row text-stone-900 dark:text-stone-100">
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
              {...pageMotion}
            >
              <TodayView
                books={books}
                dueCardsCount={dueCardsCount}
                todayMinutes={todayMinutes}
                settings={settings}
                onOpenBook={handleOpenBook}
                onStartReview={() => setActiveTab('cards')}
                onOpenUpload={() => setIsUploadOpen(true)}
                onOpenLibrary={() => setActiveTab('library')}
                onUpdateSettings={s => setSettings(s)}
              />
            </motion.div>
          )}

          {activeTab === 'library' && (
            <motion.div
              key="library"
              {...pageMotion}
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
              {...pageMotion}
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
              {...pageMotion}
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

      {overlays}
    </div>
  );
}
