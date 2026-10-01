'use client';

import React from 'react';
import { Sparkles, Layers, HelpCircle } from 'lucide-react';

interface AssistantEmptyStateProps {
  selectedText?: string;
  onSend: (prompt: string) => void;
}

/** Suggested prompts shown before the first message. */
export function AssistantEmptyState({ selectedText, onSend }: AssistantEmptyStateProps) {
  const handleSendMessage = onSend;
  return (
            <div className="py-8 space-y-6 text-center">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  Ask anything about this chapter
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 max-w-xs mx-auto">
                  I have full context of what you are reading right now.
                </p>
              </div>

              {/* Quick Prompt Pills */}
              <div className="space-y-2 text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 block px-1">
                  Suggested Prompts
                </span>

                <button
                  onClick={() => handleSendMessage('Summarize the main argument of this chapter in 3 bullet points.')}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-between"
                >
                  <span>Summarize this chapter in 3 bullet points</span>
                  <Sparkles className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                </button>

                {selectedText ? (
                  <>
                    <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
                      <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 px-2">Explain level:</span>
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
                      className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>Quiz me on this chapter</span>
                      <HelpCircle className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleSendMessage('Create a high-yield flashcard (with Question and Answer) for the most important concept in this chapter.')}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-between"
                >
                  <span>Make a flashcard for this chapter</span>
                  <Layers className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                </button>

                <button
                  onClick={() => handleSendMessage('What are 2 counterarguments or criticisms to the ideas in this chapter?')}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-between"
                >
                  <span>Critical perspectives & counterarguments</span>
                  <HelpCircle className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                </button>
              </div>
            </div>
  );
}
