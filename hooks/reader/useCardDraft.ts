import { useState } from 'react';
import { AppSettings, Book, Chapter, FlashCard } from '@/lib/db/types';
import { saveCards } from '@/lib/db';
import { generateFingerprint } from '@/lib/study/dedupe';
import { createInitialFsrsState } from '@/lib/study/fsrs';
import { normalizeQuote } from '@/lib/reader/text';
import { useToast } from '@/components/ui/Toast';

export interface CardDraft {
  front: string;
  back: string;
  drafting: boolean;
  paragraphIndex?: number;
  quoteSnippet?: string;
}

/** Editable flashcard created from a selected passage, with an optional AI-drafted question. */
export function useCardDraft(book: Book, chapter: Chapter, settings: AppSettings) {
  const toast = useToast();
  const [cardDraft, setCardDraft] = useState<CardDraft | null>(null);

  const startCardDraft = (text: string, paragraphIndex?: number) => {
    const normalized = normalizeQuote(text);
    setCardDraft({
      front: '',
      back: normalized,
      drafting: false,
      paragraphIndex,
      quoteSnippet: normalized,
    });
  };

  const draftCardQuestion = async () => {
    if (!cardDraft) return;
    setCardDraft({ ...cardDraft, drafting: true });
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'chat_assistant',
          chapterText: chapter.text,
          bookTitle: book.title,
          chapterTitle: chapter.title,
          selectedText: cardDraft.back,
          userPrompt:
            'Write ONE concise active-recall question whose answer is the highlighted passage. Reply with only the question text, no preamble.',
          chatHistory: [],
          provider: settings.provider,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to draft a question.');
      const q = String(data.text || '').trim().replace(/^["“]|["”]$/g, '');
      setCardDraft(prev => (prev ? { ...prev, front: q, drafting: false } : prev));
    } catch (e: any) {
      setCardDraft(prev => (prev ? { ...prev, drafting: false } : prev));
      toast({ message: e?.message || 'Could not draft a question.', tone: 'error' });
    }
  };

  const submitCard = async () => {
    if (!cardDraft || !cardDraft.front.trim() || !cardDraft.back.trim()) return;
    const front = cardDraft.front.trim();
    const back = cardDraft.back.trim();
    const anchor = cardDraft.quoteSnippet
      ? {
          paragraphIndex: cardDraft.paragraphIndex,
          quoteSnippet: cardDraft.quoteSnippet,
        }
      : undefined;
    setCardDraft(null);
    const card: FlashCard = {
      id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookId: book.id,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      type: 'basic',
      front,
      back,
      conceptKey: 'source-highlight',
      fingerprint: generateFingerprint(front),
      sourceAnchor: anchor,
      fsrs: createInitialFsrsState(),
      createdAt: Date.now(),
    };
    try {
      await saveCards([card]);
      toast({ message: 'Flashcard added to your deck' });
    } catch {
      toast({ message: 'Could not save the flashcard.', tone: 'error' });
    }
  };

  return { cardDraft, setCardDraft, startCardDraft, draftCardQuestion, submitCard };
}
