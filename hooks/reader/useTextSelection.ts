import { useCallback, useEffect, useState, RefObject } from 'react';
import { normalizeQuote } from '@/lib/reader/text';

/**
 * Tracks the current text selection inside the article (mouse, touch and keyboard) and the
 * viewport position for the floating toolbar. Repositions on scroll/resize.
 */
export function useTextSelection(enabled: boolean, articleRef: RefObject<HTMLDivElement | null>) {
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);

  const clearSelectionUi = useCallback(() => {
    setSelectionPosition(null);
    setSelectedText('');
  }, []);

  /** Clears both the toolbar and the browser's native selection. */
  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    clearSelectionUi();
  }, [clearSelectionUi]);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let raf = 0;

    const insideArticle = (sel: Selection) =>
      sel.rangeCount > 0 && !!articleRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer);

    const compute = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !insideArticle(sel)) {
        clearSelectionUi();
        return;
      }
      const text = normalizeQuote(sel.toString());
      if (text.length <= 3) {
        clearSelectionUi();
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setSelectedText(text);
      setSelectionPosition({ x: rect.left + rect.width / 2, y: rect.top });
    };

    const onSelectionChange = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(compute, 150);
    };
    const onReposition = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && insideArticle(sel)) compute();
      });
    };
    document.addEventListener('selectionchange', onSelectionChange);
    window.addEventListener('scroll', onReposition, { passive: true });
    window.addEventListener('resize', onReposition);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      window.removeEventListener('scroll', onReposition);
      window.removeEventListener('resize', onReposition);
      if (timer) clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
      clearSelectionUi();
    };
  }, [enabled, articleRef, clearSelectionUi]);

  return { selectedText, setSelectedText, selectionPosition, clearSelection };
}
