import { useCallback, useState } from 'react';
import { AppSettings, Book, Chapter, FlashCard } from '@/lib/db/types';
import { saveCards } from '@/lib/db';
import { createInitialFsrsState } from '@/lib/study/fsrs';
import { generateFingerprint } from '@/lib/study/dedupe';
import { extractCard, extractQuizJson } from '@/lib/ai/chatParsing';
import type { ChatMessage } from '@/components/assistant/chatTypes';

/** Conversation state for the reading assistant: sending messages, parsing structured replies, saving cards. */
export function useAssistantChat(
  book: Book | null | undefined,
  chapter: Chapter | null | undefined,
  selectedText: string | undefined,
  settings: AppSettings
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      text: promptText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'chat_assistant',
          chapterText: chapter?.text || '',
          bookTitle: book?.title || 'Unknown Book',
          author: book?.author || 'Unknown',
          chapterTitle: chapter?.title || 'Current Chapter',
          selectedText: selectedText || undefined,
          userPrompt: promptText,
          chatHistory: historyPayload,
          provider: settings.provider,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to get response from assistant.');
      }

      const modelReply = json.text || 'I have analyzed your reading context.';

      const cardMatch = extractCard(modelReply);

      let quizMatch: any = undefined;
      let cleanText = modelReply;
      const quiz = extractQuizJson(modelReply);
      if (quiz) {
        quizMatch = quiz.value;
        cleanText = modelReply.replace(quiz.raw, '').replace(/```(?:json)?\s*```/g, '').trim();
        if (!cleanText) cleanText = 'Here is a quick quiz to test your recall:';
      }

      const aiMsg: ChatMessage = {
        id: `msg_${Date.now()}_m`,
        role: 'model',
        text: cleanText,
        timestamp: Date.now(),
        generatedCard: cardMatch,
        generatedQuiz: quizMatch,
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'model',
        text: `Error: ${err?.message || 'Could not communicate with AI model. Please verify your provider settings.'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCardToDeck = useCallback(async (msgId: string, cardData: { front: string; back: string; conceptKey: string }) => {
    if (!book || !chapter) return;

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const newCard: FlashCard = {
      id: `card_${timestamp}_${randomSuffix}`,
      bookId: book.id,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      type: 'concept',
      front: cardData.front,
      back: cardData.back,
      conceptKey: cardData.conceptKey,
      fingerprint: generateFingerprint(cardData.front),
      fsrs: createInitialFsrsState(),
      createdAt: timestamp,
    };

    await saveCards([newCard]);

    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, cardAdded: true } : m))
    );
  }, [book, chapter]);

  return { messages, setMessages, input, setInput, isLoading, handleSendMessage, handleAddCardToDeck };
}
