'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Book,
  Chapter,
  AppSettings,
  FlashCard,
} from '@/lib/db/types';
import { saveBook, recordReadingTime, saveCards } from '@/lib/db';
import { generateFingerprint } from '@/lib/study/dedupe';
import { createInitialFsrsState } from '@/lib/study/fsrs';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  BookOpen,
  FileText,
  Lightbulb,
  Layers,
  HelpCircle,
  BookMarked,
  X,
  Volume2,
  Compass,
} from 'lucide-react';
import { SummaryMode } from './SummaryMode';
import { KeyIdeasMode } from './KeyIdeasMode';
import { LessonsMode } from './LessonsMode';
import { CardsMode } from './CardsMode';
import { QuizMode } from './QuizMode';
import { GlossaryMode } from './GlossaryMode';
import { SelectionMenu } from './SelectionMenu';
import { ReaderPreferences } from './ReaderPreferences';
import { TtsPlayer } from './TtsPlayer';
import { AssistantDrawer } from '../assistant/AssistantDrawer';
import { cleanPdfText } from '@/lib/pdf/clean';

export type ReaderMode = 'read' | 'summary' | 'keyIdeas' | 'lessons' | 'cards' | 'quiz' | 'glossary';

function formatChapterParagraphs(rawText: string): string[] {
  const cleaned = cleanPdfText(rawText);
  const rawParagraphs = cleaned.split(/\n\s*\n/);
  const formatted: string[] = [];

  for (const p of rawParagraphs) {
    const trimmed = p.replace(/\s+/g, ' ').trim();
    if (trimmed.length > 0) {
      formatted.push(trimmed);
    }
  }

  if (formatted.length <= 1 && cleaned.length > 300) {
    const sentences = cleaned.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [cleaned];
    let currentChunk = '';
    const chunks: string[] = [];
    for (const s of sentences) {
      currentChunk += (currentChunk ? ' ' : '') + s.trim();
      if (currentChunk.length > 400) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
    }
    if (currentChunk) chunks.push(currentChunk);
    if (chunks.length > 1) return chunks;
  }

  return formatted.length > 0 ? formatted : [cleaned];
}

interface ReaderViewProps {
  book: Book;
  chapters: Chapter[];
  initialChapterIndex?: number;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onBackToLibrary: () => void;
  dueCardsCount?: number;
}

export function ReaderView({
  book,
  chapters,
  initialChapterIndex = 0,
  settings,
  onUpdateSettings,
  onBackToLibrary,
  dueCardsCount = 0,
}: ReaderViewProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(
    Math.min(Math.max(0, initialChapterIndex), Math.max(0, chapters.length - 1))
  );
  const [activeMode, setActiveMode] = useState<ReaderMode>('read');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isViewingOriginalPdf, setIsViewingOriginalPdf] = useState(false);

  // Selection states
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);

  // Explanation / Simplify Dialog
  const [quickExplainResult, setQuickExplainResult] = useState<{ title: string; content: string } | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Keyboard shortcut Ctrl/Cmd+J for AI assistant & Esc for focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsAssistantOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  // Timer for reading habit (pauses when tab is hidden)
  const sessionSecondsRef = useRef(0);

  const activeChapter = chapters[currentChapterIndex] || chapters[0];

  // Update book progress in DB
  const updateProgress = React.useCallback(async (chIndex: number) => {
    const ch = chapters[chIndex];
    if (!ch) return;
    const percent = Math.round(((chIndex + 1) / chapters.length) * 100);
    const updatedBook: Book = {
      ...book,
      lastOpenedAt: Date.now(),
      progress: {
        chapterId: ch.id,
        chapterIndex: chIndex,
        page: ch.startPage,
        percent,
      },
    };
    await saveBook(updatedBook);
  }, [chapters, book]);

  useEffect(() => {
    updateProgress(currentChapterIndex);
  }, [currentChapterIndex, updateProgress]);

  // Record reading seconds only while tab is active/visible
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const startTimer = () => {
      if (!interval) {
        interval = setInterval(() => {
          sessionSecondsRef.current += 15;
          recordReadingTime(book.id, 15);
        }, 15000);
      }
    };

    const stopTimer = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startTimer();
      } else {
        stopTimer();
      }
    };

    if (document.visibilityState === 'visible') {
      startTimer();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sessionSecondsRef.current > 0) {
        recordReadingTime(book.id, sessionSecondsRef.current % 15);
      }
    };
  }, [book.id]);

  // Handle text selection in Read mode
  const handleMouseUp = () => {
    if (activeMode !== 'read') return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionPosition(null);
      setSelectedText('');
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 3) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setSelectionPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    } else {
      setSelectionPosition(null);
      setSelectedText('');
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Quick text actions from selection menu
  const handleExplainText = async (text: string) => {
    setSelectionPosition(null);
    setIsExplaining(true);
    setQuickExplainResult({ title: 'Contextual Explanation', content: 'Analyzing selected passage...' });

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'explain_selection',
          chapterText: activeChapter.text,
          bookTitle: book.title,
          chapterTitle: activeChapter.title,
          selectedText: text,
          provider: settings.provider,
        }),
      });
      const data = await res.json();
      setQuickExplainResult({
        title: 'Contextual Explanation',
        content: data.text || 'Could not explain text.',
      });
    } catch (e: any) {
      setQuickExplainResult({
        title: 'Error',
        content: e.message || 'Failed to explain passage.',
      });
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSimplifyText = async (text: string) => {
    setSelectionPosition(null);
    setIsExplaining(true);
    setQuickExplainResult({ title: 'Simplified Passage', content: 'Translating into plain English...' });

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'simplify_selection',
          chapterText: activeChapter.text,
          bookTitle: book.title,
          chapterTitle: activeChapter.title,
          selectedText: text,
          provider: settings.provider,
        }),
      });
      const data = await res.json();
      setQuickExplainResult({
        title: 'Simplified Passage',
        content: data.text || 'Could not simplify text.',
      });
    } catch (e: any) {
      setQuickExplainResult({
        title: 'Error',
        content: e.message || 'Failed to simplify passage.',
      });
    } finally {
      setIsExplaining(false);
    }
  };

  const handleMakeCardFromSelection = async (text: string) => {
    setSelectionPosition(null);
    const newCard: FlashCard = {
      id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookId: book.id,
      chapterId: activeChapter.id,
      chapterTitle: activeChapter.title,
      type: 'basic',
      front: `What is the significance of: "${text.slice(0, 100)}${text.length > 100 ? '...' : ''}"?`,
      back: text,
      conceptKey: 'custom-highlight',
      fingerprint: generateFingerprint(text),
      fsrs: createInitialFsrsState(),
      createdAt: Date.now(),
    };
    await saveCards([newCard]);
    alert('Created flashcard from selection! It is now in your study deck.');
  };

  const handleAddNoteFromSelection = (text: string) => {
    setSelectionPosition(null);
    const noteText = prompt('Add personal note for this highlighted passage:');
    if (noteText) {
      alert(`Note saved for "${text.slice(0, 30)}...": ${noteText}`);
    }
  };

  // Determine container styling based on reader settings
  const themeClasses = {
    paper: 'bg-[#fbf9f5] text-stone-900 dark:bg-stone-950 dark:text-stone-100',
    clean: 'bg-white text-stone-900 dark:bg-stone-950 dark:text-stone-100',
    sepia: 'bg-[#f4ecd8] text-[#43302b]',
    dark: 'bg-[#141413] text-stone-200',
  }[settings.readerTheme || 'paper'];

  const fontClasses = settings.readerFontFamily === 'serif' ? 'font-serif' : 'font-sans';

  const sizeClasses = {
    sm: 'text-sm leading-relaxed',
    md: 'text-base md:text-[17px] leading-relaxed md:leading-loose',
    lg: 'text-lg md:text-xl leading-relaxed md:leading-loose',
    xl: 'text-xl md:text-2xl leading-loose',
  }[settings.readerFontSize || 'md'];

  const widthClasses = {
    narrow: 'max-w-xl',
    normal: 'max-w-2xl md:max-w-3xl',
    wide: 'max-w-4xl',
  }[settings.readerLineWidth || 'normal'];

  const modeButtons: Array<{ id: ReaderMode; label: string; icon: React.ReactNode }> = [
    { id: 'read', label: 'Read', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'summary', label: 'Summary', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'keyIdeas', label: 'Key Ideas', icon: <Lightbulb className="w-3.5 h-3.5" /> },
    { id: 'lessons', label: 'Lessons', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'cards', label: 'Flashcards', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'quiz', label: 'Quiz', icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { id: 'glossary', label: 'Glossary', icon: <BookMarked className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors select-text ${themeClasses}`}>
      {/* Top Header Chrome */}
      {!isFocusMode && (
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-stone-950/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
          {/* Slim Chapter Progress Bar */}
          <div className="w-full bg-stone-200/60 dark:bg-stone-800/60 h-0.5">
            <div
              className="bg-stone-900 dark:bg-stone-100 h-full transition-all duration-300"
              style={{ width: `${Math.round(((currentChapterIndex + 1) / chapters.length) * 100)}%` }}
            />
          </div>

          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            {/* Back Button & Title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onBackToLibrary}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0"
                title="Back to Library"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="min-w-0">
                <h1 className="text-xs md:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                  {book.title}
                </h1>
                {/* Chapter selector */}
                <select
                  value={currentChapterIndex}
                  onChange={e => {
                    setCurrentChapterIndex(Number(e.target.value));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-transparent text-[11px] text-stone-500 dark:text-stone-400 border-none p-0 focus:ring-0 cursor-pointer font-medium truncate max-w-56 md:max-w-sm"
                >
                  {chapters.map((ch, idx) => (
                    <option key={ch.id} value={idx} className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
                      {ch.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Study Mode Tabs (Clean segmented buttons) */}
            <div className="hidden lg:flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
              {modeButtons.map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setActiveMode(btn.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeMode === btn.id
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  {btn.icon}
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>

            {/* Action Tools: Audio, Preferences, Focus Mode, AI Assistant */}
            <div className="flex items-center gap-2 shrink-0">
              {book.pdfDataUrl && (
                <button
                  onClick={() => setIsViewingOriginalPdf(!isViewingOriginalPdf)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    isViewingOriginalPdf
                      ? 'bg-stone-900 text-stone-100 border-stone-900 dark:bg-stone-100 dark:text-stone-900'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                  title="Toggle original PDF view"
                >
                  {isViewingOriginalPdf ? 'Clean Text' : 'Original PDF'}
                </button>
              )}

              <TtsPlayer
                textToRead={activeChapter?.text || ''}
                chapterTitle={activeChapter?.title || ''}
              />

              <button
                onClick={() => setIsPreferencesOpen(!isPreferencesOpen)}
                title="Reading appearance"
                className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsFocusMode(true)}
                title="Enter Focus Mode"
                className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsAssistantOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold rounded-xl hover:opacity-90 shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 dark:text-amber-600" />
                <span className="hidden sm:inline">AI Study</span>
              </button>
            </div>
          </div>

          {/* Mobile Study Mode Tabs */}
          <div className="lg:hidden flex items-center justify-between gap-1 mt-2 pt-2 border-t border-stone-200 dark:border-stone-800 overflow-x-auto no-scrollbar">
            {modeButtons.map(btn => (
              <button
                key={btn.id}
                onClick={() => setActiveMode(btn.id)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
                  activeMode === btn.id
                    ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 font-semibold'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>

          <ReaderPreferences
            isOpen={isPreferencesOpen}
            onClose={() => setIsPreferencesOpen(false)}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
          />
        </header>
      )}

      {/* Focus Mode Exit Trigger */}
      {isFocusMode && (
        <button
          onClick={() => setIsFocusMode(false)}
          className="fixed top-4 right-4 z-40 p-2 bg-stone-900/80 hover:bg-stone-900 text-stone-100 rounded-full shadow-lg backdrop-blur-xs flex items-center gap-1.5 text-xs px-3"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>Exit Focus Mode</span>
        </button>
      )}

      {/* Main Content Area */}
      <main className="flex-1 py-8 md:py-14 px-4 sm:px-6">
        {isViewingOriginalPdf && book.pdfDataUrl ? (
          <div className="w-full h-[80vh] max-w-5xl mx-auto rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-md bg-stone-100 dark:bg-stone-900">
            <iframe
              src={book.pdfDataUrl}
              className="w-full h-full border-none"
              title={`Original PDF for ${book.title}`}
            />
          </div>
        ) : activeMode === 'read' ? (
          <div
            onMouseUp={handleMouseUp}
            className={`${widthClasses} mx-auto space-y-8 animate-in fade-in duration-200`}
          >
            {/* Chapter Header */}
            <div className="pb-8 border-b border-stone-200/60 dark:border-stone-800/60 space-y-3 text-center sm:text-left">
              <span className="text-xs uppercase tracking-widest text-stone-500 font-semibold block">
                Chapter {currentChapterIndex + 1} of {chapters.length} · Pages {activeChapter.startPage}–{activeChapter.endPage}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold font-serif tracking-tight text-stone-950 dark:text-stone-50 leading-tight">
                {activeChapter.title}
              </h2>
            </div>

            {/* Formatted Chapter Paragraphs with Drop Cap & Clean Spacing */}
            <div className={`${fontClasses} ${sizeClasses} text-stone-900 dark:text-stone-100`}>
              {formatChapterParagraphs(activeChapter.text).map((para, idx) => (
                <p
                  key={idx}
                  className={`mb-6 leading-relaxed ${
                    idx === 0 && settings.readerFontFamily === 'serif'
                      ? 'first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:text-stone-900 dark:first-letter:text-stone-100'
                      : ''
                  }`}
                >
                  {para}
                </p>
              ))}
            </div>

            {/* Bottom Chapter Navigation Footer */}
            <div className="pt-12 pb-20 flex items-center justify-between border-t border-stone-200/60 dark:border-stone-800/60">
              <button
                onClick={handlePrevChapter}
                disabled={currentChapterIndex === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Chapter</span>
              </button>

              <span className="text-xs text-stone-400 font-medium">
                Chapter {currentChapterIndex + 1} of {chapters.length}
              </span>

              <button
                onClick={handleNextChapter}
                disabled={currentChapterIndex === chapters.length - 1}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 hover:opacity-90 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <span>Next Chapter</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}

        {activeMode === 'summary' && (
          <SummaryMode book={book} chapter={activeChapter} settings={settings} />
        )}

        {activeMode === 'keyIdeas' && (
          <KeyIdeasMode book={book} chapter={activeChapter} settings={settings} />
        )}

        {activeMode === 'lessons' && (
          <LessonsMode book={book} chapter={activeChapter} settings={settings} />
        )}

        {activeMode === 'cards' && (
          <CardsMode book={book} chapter={activeChapter} settings={settings} />
        )}

        {activeMode === 'quiz' && (
          <QuizMode book={book} chapter={activeChapter} settings={settings} />
        )}

        {activeMode === 'glossary' && (
          <GlossaryMode book={book} chapter={activeChapter} settings={settings} />
        )}
      </main>

      {/* Floating Text Selection Popup */}
      <SelectionMenu
        position={selectionPosition}
        selectedText={selectedText}
        onExplain={handleExplainText}
        onSimplify={handleSimplifyText}
        onMakeCard={handleMakeCardFromSelection}
        onAddNote={handleAddNoteFromSelection}
      />

      {/* Quick Explain / Simplify Result Modal */}
      {quickExplainResult && (
        <div
          onClick={() => setQuickExplainResult(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-2xs animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{quickExplainResult.title}</span>
              </h3>
              <button
                onClick={() => setQuickExplainResult(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs md:text-sm text-stone-700 dark:text-stone-300 whitespace-pre-line leading-relaxed">
              {quickExplainResult.content}
            </p>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setQuickExplainResult(null)}
                className="px-4 py-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 text-xs font-semibold rounded-xl"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation & Chapter Progress Bar */}
      {!isFocusMode && (
        <footer className="sticky bottom-0 z-30 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <button
              onClick={handlePrevChapter}
              disabled={currentChapterIndex === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Chapter</span>
            </button>

            {/* Reading percent & chapter info */}
            <div className="text-center text-xs text-stone-500 hidden sm:block">
              <span>
                {currentChapterIndex + 1} of {chapters.length} chapters
              </span>
              <span className="mx-2">·</span>
              <span>{Math.round(((currentChapterIndex + 1) / chapters.length) * 100)}% Complete</span>
            </div>

            <button
              onClick={handleNextChapter}
              disabled={currentChapterIndex === chapters.length - 1}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            >
              <span>Next Chapter</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      )}

      {/* Context-Aware Assistant Drawer */}
      <AssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        book={book}
        chapter={activeChapter}
        selectedText={selectedText}
        onClearSelection={() => setSelectedText('')}
        settings={settings}
        dueCardsCount={dueCardsCount}
      />
    </div>
  );
}
