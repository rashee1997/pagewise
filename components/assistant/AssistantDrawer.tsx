'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, BookOpen, Quote, Trash2, Loader2 } from 'lucide-react';
import { Book, Chapter, AppSettings } from '@/lib/db/types';
import { Dialog } from '@/components/ui/Dialog';
import { useAssistantChat } from '@/hooks/assistant/useAssistantChat';
import { AssistantEmptyState } from './AssistantEmptyState';
import { ChatMessageList } from './ChatMessageList';
import type { CitationItem } from './chatTypes';

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  book?: Book | null;
  chapter?: Chapter | null;
  selectedText?: string;
  onClearSelection?: () => void;
  settings: AppSettings;
  dueCardsCount?: number;
  /** Text to send automatically when opened (e.g. from the command menu) */
  seedPrompt?: string | null;
  onSeedConsumed?: () => void;
  onCitationClick?: (citation: CitationItem) => void;
}

export function AssistantDrawer({
  isOpen,
  onClose,
  book,
  chapter,
  selectedText,
  onClearSelection,
  settings,
  seedPrompt,
  onSeedConsumed,
  onCitationClick,
}: AssistantDrawerProps) {
  const { messages, setMessages, input, setInput, isLoading, handleSendMessage, handleAddCardToDeck } = useAssistantChat(
    book,
    chapter,
    selectedText,
    settings
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isDocked, setIsDocked] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const apply = () => setIsDocked(mql.matches);
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, []);

  // Only auto-scroll when the reader is already near the bottom (don't yank them away from earlier replies)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      messagesEndRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && seedPrompt) {
      handleSendMessage(seedPrompt);
      onSeedConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, seedPrompt]);

  if (!isOpen) return null;

  const panelClass = isDocked
    ? 'fixed top-0 right-0 z-40 w-[26rem] h-dvh bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border-l border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200'
    : 'w-full sm:w-104 md:w-112 h-dvh bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border-l border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200';

  // Plain function (not a component) so the subtree keeps its state across renders
  const wrap = (children: React.ReactNode) =>
    isDocked ? (
      <aside
        aria-label="Reading assistant"
        className={panelClass}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose();
        }}
      >
        {children}
      </aside>
    ) : (
      <Dialog isOpen={isOpen} onClose={onClose} title="Reading assistant" hideTitle placement="right" panelClassName={panelClass}>
        {children}
      </Dialog>
    );

  return wrap(
    <>
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
              <span className="text-xs text-stone-600 dark:text-stone-400 block -mt-0.5">
                Context-aware companion
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                aria-label="Clear chat"
                title="Clear chat"
                className="p-1.5 rounded-lg text-stone-600 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close assistant"
              className="p-2 rounded-lg text-stone-600 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Active Context Banner */}
        <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-950 border-b border-stone-100 dark:border-stone-800/80 text-xs space-y-1 shrink-0">
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400 truncate">
            <BookOpen className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 shrink-0" />
            <span className="truncate">
              {book ? `${book.title}` : 'Library'}
              {chapter ? ` · ${chapter.title}` : ''}
            </span>
          </div>

          {selectedText && (
            <div className="flex items-start justify-between gap-2 p-2 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-900 dark:text-amber-300">
              <div className="flex items-start gap-1.5 truncate">
                <Quote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="truncate italic">&ldquo;{selectedText}&rdquo;</span>
              </div>
              <button
                onClick={onClearSelection}
                aria-label="Clear selected text"
                className="text-amber-700 hover:text-amber-950 dark:hover:text-amber-100 shrink-0 font-bold"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Chat Message Scrollable Area */}
        <div ref={scrollerRef} role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation" className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          {messages.length === 0 ? (
            <AssistantEmptyState selectedText={selectedText} onSend={handleSendMessage} />
          ) : (
            <ChatMessageList messages={messages} onAddCard={handleAddCardToDeck} onCitationClick={onCitationClick} />
          )}

          {isLoading && (
            <div role="status" className="flex items-center gap-2 text-stone-600 dark:text-stone-400 text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-stone-600 dark:text-stone-400" />
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
              aria-label="Message the reading assistant"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything about this chapter..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-xs md:text-sm bg-stone-100 dark:bg-stone-800 border-none rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-400 text-stone-900 dark:text-stone-100"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
    </>
  );
}
