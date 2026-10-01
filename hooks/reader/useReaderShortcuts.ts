import { useEffect, MutableRefObject } from 'react';
import { isTypingTarget } from '@/lib/reader/text';
import { MODE_BUTTONS } from '@/components/reader/readerModes';
import type { ReaderActions } from '@/components/reader/readerActions';

/** Reader keyboard shortcuts. Single-key shortcuts pause while typing or while a modal is open. */
export function useReaderShortcuts(actionsRef: MutableRefObject<ReaderActions>) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const a = actionsRef.current;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        a.toggleAssistant();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      const key = e.key.toLowerCase();
      if (key === 'escape') a.exitFocus();
      else if (key === ']') a.next();
      else if (key === '[') a.prev();
      else if (key === 'f') a.toggleFocus();
      else if (/^[1-7]$/.test(key)) a.setMode(MODE_BUTTONS[Number(key) - 1].id);
      else if (['h', 'n', 'c', 'e', 's'].includes(key) && a.selection(key)) e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actionsRef]);
}
