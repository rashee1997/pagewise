import { useRef, useState } from 'react';
import { AppSettings, Book, Chapter } from '@/lib/db/types';

export interface AiSelectionState {
  kind: 'explain_selection' | 'simplify_selection';
  text: string;
  status: 'loading' | 'done' | 'error';
  content: string;
}

/** Explain / simplify a selected passage via the AI route, with abort and retry support. */
export function useSelectionAI(book: Book, chapter: Chapter, settings: AppSettings) {
  const [aiSelection, setAiSelection] = useState<AiSelectionState | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runSelectionAI = async (kind: AiSelectionState['kind'], text: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAiSelection({ kind, text, status: 'loading', content: '' });
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          kind,
          chapterText: chapter.text,
          bookTitle: book.title,
          chapterTitle: chapter.title,
          selectedText: text,
          provider: settings.provider,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'The AI request failed.');
      setAiSelection({ kind, text, status: 'done', content: data.text || 'No response was returned.' });
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setAiSelection({ kind, text, status: 'error', content: e?.message || 'Failed to reach the AI model.' });
    }
  };

  const closeAiSelection = () => {
    abortRef.current?.abort();
    setAiSelection(null);
  };

  return { aiSelection, runSelectionAI, closeAiSelection };
}
