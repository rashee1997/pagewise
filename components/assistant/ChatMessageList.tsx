'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Layers, PlusCircle, CheckCircle2, Quote, ArrowUpRight } from 'lucide-react';
import { ChatQuizWidget } from './ChatQuizWidget';
import type { ChatMessage, CitationItem } from './chatTypes';

interface ChatMessageListProps {
  messages: ChatMessage[];
  onAddCard: (msgId: string, card: { front: string; back: string; conceptKey: string }) => void;
  onCitationClick?: (citation: CitationItem) => void;
}

export function ChatMessageList({ messages, onAddCard, onCitationClick }: ChatMessageListProps) {
  const handleAddCardToDeck = onAddCard;
  return (
    <>
      {messages.map(m => {
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

                  {/* Render Grounded Source Citations (Clickable NotebookLM-style citations) */}
                  {!isUser && m.citations && m.citations.length > 0 && (
                    <div className="max-w-[85%] p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl text-xs space-y-1.5 mt-1">
                      <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 text-xs">
                        <Quote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Source Citations ({m.citations.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {m.citations.map(c => (
                          <button
                            key={c.index}
                            onClick={() => onCitationClick?.(c)}
                            title={`Jump to quote: "${c.quote}"`}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-stone-900 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 border border-amber-300/80 dark:border-amber-800/80 rounded-lg text-xs font-medium text-stone-800 dark:text-stone-200 shadow-2xs transition-all cursor-pointer group text-left"
                          >
                            <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {c.index}
                            </span>
                            <span className="truncate max-w-44 line-clamp-1">&ldquo;{c.quote}&rdquo;</span>
                            <ArrowUpRight className="w-3 h-3 text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render Interactive Quiz Widget GUI if detected */}
                  {!isUser && m.generatedQuiz && <ChatQuizWidget quiz={m.generatedQuiz} />}

                  {/* Render 1-click Add Card UI if Assistant generated a flashcard */}
                  {!isUser && m.generatedCard && (
                    <div className="max-w-[85%] p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs space-y-2 mt-1">
                      <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        <span>Generated Flashcard Detected</span>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400">
                        Q: {m.generatedCard.front}
                      </p>
                      {m.cardAdded ? (
                        <div className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Added to Book Deck</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddCardToDeck(m.id, m.generatedCard!)}
                          className="px-2.5 py-1 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:opacity-90"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Add to Chapter Flashcards</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
      })}
    </>
  );
}
