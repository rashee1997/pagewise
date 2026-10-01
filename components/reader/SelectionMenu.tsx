'use client';

import React from 'react';
import { HelpCircle, Sparkles, Highlighter, StickyNote, PlusCircle } from 'lucide-react';

interface SelectionMenuProps {
  position: { x: number; y: number } | null;
  selectedText: string;
  onExplain: (text: string) => void;
  onSimplify: (text: string) => void;
  onHighlight: (text: string) => void;
  onMakeCard: (text: string) => void;
  onAddNote: (text: string) => void;
}

const MENU_WIDTH = 360;

/**
 * Floating toolbar for the current text selection. On narrow viewports it docks above the
 * bottom bar instead of floating, so it is never clipped and has full-size touch targets.
 */
export function SelectionMenu({
  position,
  selectedText,
  onExplain,
  onSimplify,
  onHighlight,
  onMakeCard,
  onAddNote,
}: SelectionMenuProps) {
  if (!position || !selectedText.trim()) return null;

  const actions: Array<{ label: string; key: string; icon: React.ReactNode; run: (t: string) => void }> = [
    { label: 'Explain', key: 'E', icon: <HelpCircle className="w-4 h-4" />, run: onExplain },
    { label: 'Simplify', key: 'S', icon: <Sparkles className="w-4 h-4" />, run: onSimplify },
    { label: 'Highlight', key: 'H', icon: <Highlighter className="w-4 h-4" />, run: onHighlight },
    { label: 'Note', key: 'N', icon: <StickyNote className="w-4 h-4" />, run: onAddNote },
    { label: 'Card', key: 'C', icon: <PlusCircle className="w-4 h-4" />, run: onMakeCard },
  ];

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const docked = vw < 640;
  const half = Math.min(MENU_WIDTH, vw - 16) / 2;
  const left = Math.min(Math.max(position.x, half + 8), vw - half - 8);
  // flip below the selection if there is no room above
  const placeBelow = position.y < 64;

  return (
    <div
      role="toolbar"
      aria-label="Selected text actions"
      onMouseDown={e => e.preventDefault()} // keep the selection while clicking
      style={
        docked
          ? undefined
          : {
              position: 'fixed',
              left: `${left}px`,
              top: `${position.y}px`,
              transform: placeBelow ? 'translate(-50%, 28px)' : 'translate(-50%, calc(-100% - 10px))',
            }
      }
      className={`z-50 flex items-center [--focus:#fbbf24] dark:[--focus:#1d4ed8] bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 shadow-xl border border-stone-800 dark:border-stone-200 animate-in fade-in zoom-in-95 duration-100 ${
        docked
          ? 'fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] rounded-2xl p-1 justify-between'
          : 'rounded-xl px-1.5 py-1 gap-0.5'
      }`}
    >
      {actions.map(a => (
        <button
          key={a.label}
          type="button"
          onClick={() => a.run(selectedText)}
          aria-keyshortcuts={a.key}
          className={`flex items-center gap-1.5 text-xs font-medium rounded-lg hover:bg-stone-800 dark:hover:bg-stone-200 focus-visible:bg-stone-800 dark:focus-visible:bg-stone-200 ${
            docked ? 'flex-col min-h-12 flex-1 px-1 py-1.5' : 'px-2.5 py-1.5'
          }`}
        >
          {a.icon}
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}
