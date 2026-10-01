'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  BookOpen,
  Quote,
  Layers,
  HelpCircle,
  PlusCircle,
  CheckCircle2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Book, Chapter, AppSettings, FlashCard } from '@/lib/db/types';
import { saveCards } from '@/lib/db';
import { createInitialFsrsState } from '@/lib/study/fsrs';
import { generateFingerprint } from '@/lib/study/dedupe';
import ReactMarkdown from 'react-markdown';

function ChatQuizWidget({ quiz }: { quiz: { question: string; options: string[]; correctAnswerIndex: number; explanation: string } }) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <div className="max-w-[85%] p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs space-y-3 shadow-xs my-2">
      <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
        <HelpCircle className="w-4 h-4 text-emerald-600" />
        <span>Interactive Quiz Check</span>
      </div>
      <p className="font-medium text-stone-800 dark:text-stone-200">
        {quiz.question}
      </p>
      <div className="space-y-1.5 pt-1">
        {quiz.options.map((opt, optIdx) => {
          let btnStyle = 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200';
          if (isSubmitted) {
            if (optIdx === quiz.correctAnswerIndex) {
              btnStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold';
            } else if (selectedOption === optIdx) {
              btnStyle = 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200';
            }
          } else if (selectedOption === optIdx) {
            btnStyle = 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950';
          }

          return (
            <button
              key={optIdx}
              onClick={() => {
                if (!isSubmitted) setSelectedOption(optIdx);
              }}
              className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors flex items-center justify-between cursor-pointer ${btnStyle}`}
            >
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {!isSubmitted ? (
        <button
          onClick={() => {
            if (selectedOption !== null) setIsSubmitted(true);
          }}
          disabled={selectedOption === null}
          className="w-full py-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer"
        >
          Submit Answer
        </button>
      ) : (
        <div className="p-3 bg-stone-50 dark:bg-stone-950 rounded-lg border border-stone-200 dark:border-stone-800 space-y-1 text-[11px] text-stone-600 dark:text-stone-400">
          <p className="font-semibold text-stone-900 dark:text-stone-100">
            {selectedOption === quiz.correctAnswerIndex ? 'Correct! Excellent recall.' : 'Incorrect.'}
          </p>
          <p>{quiz.explanation}</p>
        </div>
      )}
    </div>
  );
}

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  book?: Book | null;
  chapter?: Chapter | null;
  selectedText?: string;
  onClearSelection?: () => void;
  settings: AppSettings;
  dueCardsCount?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  generatedCard?: {
    front: string;
    back: string;
    conceptKey: string;
  };
  generatedQuiz?: {
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
  };
  cardAdded?: boolean;
}

export function AssistantDrawer({
  isOpen,
  onClose,
  book,
  chapter,
  selectedText,
  onClearSelection,
  settings,
  dueCardsCount = 0,
}: AssistantDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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

      // Check if response contains a generated flashcard format (Q: ... A: ...)
      let cardMatch: { front: string; back: string; conceptKey: string } | undefined = undefined;
      const qMatch = modelReply.match(/(?:Front|Question|Q):\s*(.+?)(?:\n|$)/i);
      const aMatch = modelReply.match(/(?:Back|Answer|A):\s*(.+?)(?:\n|$)/i);
      if (qMatch && aMatch) {
        cardMatch = {
          front: qMatch[1].trim(),
          back: aMatch[1].trim(),
          conceptKey: 'assistant-generated',
        };
      }

      let quizMatch: any = undefined;
      let cleanText = modelReply;
      try {
        const jsonMatch = modelReply.match(/\{[\s\S]*?"question"[\s\S]*?"options"[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.question && Array.isArray(parsed.options) && typeof parsed.correctAnswerIndex === 'number') {
            quizMatch = parsed;
            cleanText = modelReply.replace(jsonMatch[0], '').trim();
            if (!cleanText) {
              cleanText = "Here is a quick quiz to test your recall:";
            }
          }
        }
      } catch (e) {
        // ignore
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

  const handleAddCardToDeck = React.useCallback(async (msgId: string, cardData: { front: string; back: string; conceptKey: string }) => {
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

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-2xs flex justify-end animate-in fade-in duration-150"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:w-104 md:w-112 h-full bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Reading Assistant
              </h3>
              <span className="text-[11px] text-stone-400 block -mt-0.5">
                Context-aware companion
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                title="Clear chat"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Active Context Banner */}
        <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-950 border-b border-stone-100 dark:border-stone-800/80 text-xs space-y-1 shrink-0">
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400 truncate">
            <BookOpen className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">
              {book ? `${book.title}` : 'Library'}
              {chapter ? ` · ${chapter.title}` : ''}
            </span>
          </div>

          {selectedText && (
            <div className="flex items-start justify-between gap-2 p-2 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-[11px] text-amber-900 dark:text-amber-300">
              <div className="flex items-start gap-1.5 truncate">
                <Quote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="truncate italic">&ldquo;{selectedText}&rdquo;</span>
              </div>
              <button
                onClick={onClearSelection}
                className="text-amber-700 hover:text-amber-950 dark:hover:text-amber-100 shrink-0 font-bold"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Chat Message Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            /* Empty state with suggested prompts */
            <div className="py-8 space-y-6 text-center">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  Ask anything about this chapter
                </h4>
                <p className="text-xs text-stone-400 max-w-xs mx-auto">
                  I have full context of what you are reading right now.
                </p>
              </div>

              {/* Quick Prompt Pills */}
              <div className="space-y-2 text-left">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block px-1">
                  Suggested Prompts
                </span>

                <button
                  onClick={() => handleSendMessage('Summarize the main argument of this chapter in 3 bullet points.')}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-between"
                >
                  <span>Summarize this chapter in 3 bullet points</span>
                  <Sparkles className="w-3.5 h-3.5 text-stone-400" />
                </button>

                {selectedText ? (
                  <>
                    <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
                      <span className="text-[11px] font-semibold text-stone-500 px-2">Explain level:</span>
                      <button
                        onClick={() => handleSendMessage(`Explain this highlighted text simply (like I am new to the topic): "${selectedText}"`)}
                        className="px-2 py-1 text-xs bg-white dark:bg-stone-900 rounded-lg text-stone-800 dark:text-stone-200 font-medium hover:bg-stone-50"
                      >
                        Simple
                      </button>
                      <button
                        onClick={() => handleSendMessage(`Explain this highlighted passage in detail with contextual implications: "${selectedText}"`)}
                        className="px-2 py-1 text-xs bg-white dark:bg-stone-900 rounded-lg text-stone-800 dark:text-stone-200 font-medium hover:bg-stone-50"
                      >
                        Normal
                      </button>
                      <button
                        onClick={() => handleSendMessage(`Provide an expert analytical breakdown of this highlighted passage: "${selectedText}"`)}
                        className="px-2 py-1 text-xs bg-white dark:bg-stone-900 rounded-lg text-stone-800 dark:text-stone-200 font-medium hover:bg-stone-50"
                      >
                        Expert
                      </button>
                    </div>

                    <button
                      onClick={() => handleSendMessage(`Create an active recall flashcard from this selection: "${selectedText}"`)}
                      className="w-full p-2.5 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/70 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-900 dark:text-amber-200 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>Create flashcard from selected text</span>
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleSendMessage('Give me a quick 1-question quiz on this chapter to test my recall right now.')}
                      className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>Quiz me on this chapter</span>
                      <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleSendMessage('Create a high-yield flashcard (with Question and Answer) for the most important concept in this chapter.')}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-between"
                >
                  <span>Make a flashcard for this chapter</span>
                  <Layers className="w-3.5 h-3.5 text-stone-400" />
                </button>

                <button
                  onClick={() => handleSendMessage('What are 2 counterarguments or criticisms to the ideas in this chapter?')}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-between"
                >
                  <span>Critical perspectives & counterarguments</span>
                  <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                </button>
              </div>
            </div>
          ) : (
            /* Render Messages */
            messages.map(m => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs md:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 font-normal rounded-tr-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-tl-xs'
                    }`}
                  >
                    {isUser ? (
                      m.text
                    ) : (
                      <div className="prose prose-stone dark:prose-invert text-xs md:text-sm max-w-none">
                        <ReactMarkdown>{m.text}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Render Interactive Quiz Widget GUI if detected */}
                  {!isUser && m.generatedQuiz && <ChatQuizWidget quiz={m.generatedQuiz} />}

                  {/* Render 1-click Add Card UI if Assistant generated a flashcard */}
                  {!isUser && m.generatedCard && (
                    <div className="max-w-[85%] p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs space-y-2 mt-1">
                      <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        <span>Generated Flashcard Detected</span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400">
                        Q: {m.generatedCard.front}
                      </p>
                      {m.cardAdded ? (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Added to Book Deck</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddCardToDeck(m.id, m.generatedCard!)}
                          className="px-2.5 py-1 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 hover:opacity-90"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Add to Chapter Flashcards</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-stone-400 text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin text-stone-500" />
              <span>Thinking with chapter context...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shrink-0">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything about this chapter..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-xs md:text-sm bg-stone-100 dark:bg-stone-800 border-none rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-400 text-stone-900 dark:text-stone-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
