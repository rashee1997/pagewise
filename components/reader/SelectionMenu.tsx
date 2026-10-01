'use client';

import React from 'react';
import { HelpCircle, Sparkles, PlusCircle, StickyNote } from 'lucide-react';

interface SelectionMenuProps {
  position: { x: number; y: number } | null;
  selectedText: string;
  onExplain: (text: string) => void;
  onSimplify: (text: string) => void;
  onMakeCard: (text: string) => void;
  onAddNote: (text: string) => void;
}

export function SelectionMenu({
  position,
  selectedText,
  onExplain,
  onSimplify,
  onMakeCard,
  onAddNote,
}: SelectionMenuProps) {
  if (!position || !selectedText.trim()) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%) translateY(-10px)',
      }}
      className="z-50 flex items-center bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 rounded-xl shadow-xl px-2 py-1.5 gap-1 border border-stone-800 dark:border-stone-200 animate-in fade-in zoom-in-95 duration-100"
    >
      <button
        onClick={() => onExplain(selectedText)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span>Explain</span>
      </button>

      <div className="w-px h-3.5 bg-stone-700 dark:bg-stone-300" />

      <button
        onClick={() => onSimplify(selectedText)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Simplify</span>
      </button>

      <div className="w-px h-3.5 bg-stone-700 dark:bg-stone-300" />

      <button
        onClick={() => onMakeCard(selectedText)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
      >
        <PlusCircle className="w-3.5 h-3.5" />
        <span>Make Card</span>
      </button>

      <div className="w-px h-3.5 bg-stone-700 dark:bg-stone-300" />

      <button
        onClick={() => onAddNote(selectedText)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
      >
        <StickyNote className="w-3.5 h-3.5" />
        <span>Note</span>
      </button>
    </div>
  );
}
