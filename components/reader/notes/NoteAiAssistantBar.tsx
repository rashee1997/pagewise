'use client';

import React from 'react';
import { Sparkles, Loader2, Send } from 'lucide-react';

interface NoteAiAssistantBarProps {
  aiPrompt: string;
  onAiPromptChange: (prompt: string) => void;
  isAiLoading: boolean;
  onRunAiCommand: (instruction?: string) => void;
  onGenerateFlashcard: () => void;
}

export function NoteAiAssistantBar({
  aiPrompt,
  onAiPromptChange,
  isAiLoading,
  onRunAiCommand,
  onGenerateFlashcard,
}: NoteAiAssistantBarProps) {
  return (
    <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl space-y-2.5 shrink-0">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>AI Assistant</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onRunAiCommand('Summarize and condense this note clearly with key bullet points.')}
            disabled={isAiLoading}
            className="px-2.5 py-1 bg-white dark:bg-stone-900 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800 rounded-lg text-xs font-medium text-stone-800 dark:text-stone-200 cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            ✨ Summarize
          </button>
          <button
            type="button"
            onClick={() => onRunAiCommand('Elaborate and provide deeper conceptual insights and real-world examples for this note.')}
            disabled={isAiLoading}
            className="px-2.5 py-1 bg-white dark:bg-stone-900 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800 rounded-lg text-xs font-medium text-stone-800 dark:text-stone-200 cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            💡 Expand
          </button>
          <button
            type="button"
            onClick={onGenerateFlashcard}
            disabled={isAiLoading}
            className="px-2.5 py-1 bg-amber-600 text-white hover:bg-amber-700 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            🧠 Flashcard
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={aiPrompt}
          onChange={e => onAiPromptChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onRunAiCommand();
          }}
          placeholder="Ask AI to brainstorm or rewrite..."
          className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-900 rounded-xl focus-visible:ring-2 focus-visible:ring-amber-500 text-stone-900 dark:text-stone-100"
        />
        <button
          type="button"
          onClick={() => onRunAiCommand()}
          disabled={isAiLoading || !aiPrompt.trim()}
          className="px-3 py-1.5 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 rounded-xl text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>
    </div>
  );
}
