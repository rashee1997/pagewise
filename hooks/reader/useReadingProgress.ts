import { useCallback, useEffect, useRef, useState, RefObject } from 'react';
import { Book, Chapter } from '@/lib/db/types';
import { db, recordReadingTime, updateBookProgress } from '@/lib/db';
import { prefersReducedMotion } from '@/lib/reader/text';
import { useToast } from '@/components/ui/Toast';
import type { ReaderMode } from '@/components/reader/readerModes';
import { useLatestRef } from '@/hooks/useLatestRef';

interface Options {
  book: Book;
  chapters: Chapter[];
  currentChapterIndex: number;
  activeMode: ReaderMode;
  isViewingOriginalPdf: boolean;
  articleRef: RefObject<HTMLDivElement | null>;
}

/**
 * Position-accurate reading progress: tracks furthest-read fraction per chapter, restores the
 * scroll position on open, persists with partial row updates, and counts active reading time.
 */
export function useReadingProgress({
  book,
  chapters,
  currentChapterIndex,
  activeMode,
  isViewingOriginalPdf,
  articleRef,
}: Options) {
  const toast = useToast();
  const [chapterProgress, setChapterProgress] = useState<Record<string, number>>(book.chapterProgress || {});
  const chapterProgressRef = useLatestRef(chapterProgress);
  const scrollPosRef = useRef(book.progress.scrollFraction || 0);
  const readFractionRef = useRef(0);
  const restoredRef = useRef(false);
  const currentIndexRef = useLatestRef(currentChapterIndex);

  const saveProgress = useCallback(
    (chIndex: number, fraction: number) => {
      const ch = chapters[chIndex];
      if (!ch) return;
      const percent = Math.min(100, Math.round(((chIndex + Math.min(1, fraction)) / chapters.length) * 100));
      updateBookProgress(book.id, {
        chapterId: ch.id,
        chapterIndex: chIndex,
        page: ch.startPage,
        percent,
        scrollFraction: scrollPosRef.current,
      }).catch(() => {});
      db.books.update(book.id, { chapterProgress: chapterProgressRef.current }).catch(() => {});
    },
    [chapters, book.id, chapterProgressRef]
  );

  // Track scroll position / furthest-read fraction (read mode only)
  useEffect(() => {
    if (activeMode !== 'read' || isViewingOriginalPdf) return;
    let raf = 0;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const measure = () => {
      raf = 0;
      const art = articleRef.current;
      if (!art) return;
      const rect = art.getBoundingClientRect();
      const total = Math.max(1, rect.height);
      const seen = Math.min(total, Math.max(0, window.innerHeight * 0.85 - rect.top));
      const furthest = seen / total;
      scrollPosRef.current = Math.min(1, Math.max(0, -rect.top / Math.max(1, total - window.innerHeight * 0.5)));
      readFractionRef.current = furthest;
      const chId = chapters[currentIndexRef.current]?.id;
      if (chId && furthest > (chapterProgressRef.current[chId] || 0) + 0.01) {
        const next = { ...chapterProgressRef.current, [chId]: Math.min(1, furthest) };
        chapterProgressRef.current = next;
        setChapterProgress(next);
      }
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveProgress(currentIndexRef.current, readFractionRef.current), 1000);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    measure();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, [activeMode, isViewingOriginalPdf, currentChapterIndex, chapters, saveProgress, articleRef, chapterProgressRef, currentIndexRef]);

  // Flush progress when the tab hides or the reader closes
  useEffect(() => {
    const flush = () => saveProgress(currentIndexRef.current, readFractionRef.current);
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      flush();
    };
  }, [saveProgress, currentIndexRef]);

  // Resume scroll position once on open
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const frac = book.progress.scrollFraction || 0;
    if (frac < 0.03) return;
    const t = setTimeout(() => {
      const art = articleRef.current;
      if (!art) return;
      const top =
        art.getBoundingClientRect().top + window.scrollY + frac * Math.max(0, art.offsetHeight - window.innerHeight * 0.5);
      window.scrollTo({ top, behavior: 'auto' });
      toast({
        message: 'Resumed where you left off',
        actionLabel: 'Go to chapter start',
        onAction: () => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' }),
      });
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reading-time habit timer (pauses when the tab is hidden)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!interval) interval = setInterval(() => recordReadingTime(book.id, 15), 15000);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    const onVis = () => (document.visibilityState === 'visible' ? start() : stop());
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [book.id]);

  /** Call when the chapter changes so position state restarts at the top. */
  const resetForChapter = useCallback(
    (idx: number) => {
      scrollPosRef.current = 0;
      readFractionRef.current = 0;
      saveProgress(idx, 0);
    },
    [saveProgress]
  );

  const overallPercent = (chapterId: string) =>
    Math.round(((currentChapterIndex + Math.min(1, chapterProgress[chapterId] || 0)) / chapters.length) * 100);

  return { chapterProgress, resetForChapter, overallPercent };
}
