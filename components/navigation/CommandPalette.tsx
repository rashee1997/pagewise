'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';

export interface Command {
  id: string;
  label: string;
  group: string;
  icon?: React.ReactNode;
  /** Display-only shortcut hint, e.g. "⌘J" */
  shortcut?: string;
  /** Extra search terms */
  keywords?: string;
  /** Secondary text shown at the right (e.g. author) */
  detail?: string;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
  /** Fallback offered when nothing matches (e.g. "Ask the assistant") */
  onNoResultsAction?: (query: string) => void;
}

/** Subsequence-aware scorer: lower is better, -1 = no match. */
function score(cmd: Command, q: string): number {
  const hay = `${cmd.label} ${cmd.keywords || ''} ${cmd.detail || ''}`.toLowerCase();
  const idx = hay.indexOf(q);
  if (idx >= 0) return idx === 0 ? 0 : 1 + idx / 100;
  // fuzzy: every char of q appears in order
  let pos = 0;
  for (const ch of q) {
    pos = hay.indexOf(ch, pos);
    if (pos < 0) return -1;
    pos++;
  }
  return 5 + pos / 100;
}

export function CommandPalette({ isOpen, onClose, commands, onNoResultsAction }: CommandPaletteProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Command menu"
      hideTitle
      placement="top"
      panelClassName="w-full max-w-xl bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden"
    >
      {/* Dialog unmounts its children when closed, so query and selection reset on every open */}
      <PaletteBody commands={commands} onClose={onClose} onNoResultsAction={onNoResultsAction} />
    </Dialog>
  );
}

function PaletteBody({ commands, onClose, onNoResultsAction }: Omit<CommandPaletteProps, 'isOpen'>) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands
      .map(c => ({ c, s: score(c, q) }))
      .filter(x => x.s >= 0)
      .sort((a, b) => a.s - b.s)
      .map(x => x.c);
  }, [commands, query]);

  const activeIndex = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, results]);

  const runCommand = (cmd: Command) => {
    onClose();
    // let the dialog restore focus first, then run
    setTimeout(() => cmd.run(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(Math.max(0, results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = results[activeIndex];
      if (cmd) runCommand(cmd);
      else if (onNoResultsAction && query.trim()) {
        onClose();
        onNoResultsAction(query.trim());
      }
    }
  };

  const listId = `${baseId}-list`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  // Group headers only when not searching
  const showGroups = !query.trim();

  return (
    <>
      <div className="flex items-center px-4 py-3.5 border-b border-stone-200 dark:border-stone-800 gap-3">
        <Search className="w-5 h-5 text-stone-600 dark:text-stone-400 shrink-0" aria-hidden="true" />
        <input
          data-autofocus
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results.length ? optionId(activeIndex) : undefined}
          aria-autocomplete="list"
          aria-label="Search commands, books and chapters"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Type a command or search…"
          className="w-full bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-600 dark:placeholder:text-stone-400 focus:outline-hidden"
        />
        <kbd className="hidden sm:inline px-1.5 py-0.5 text-xs font-mono bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-stone-600 dark:text-stone-400">
          Esc
        </kbd>
      </div>

      <div ref={listRef} id={listId} role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto overscroll-contain p-2">
        {results.map((cmd, i) => {
          const header = showGroups && (i === 0 || results[i - 1].group !== cmd.group) ? cmd.group : null;
          const isActive = i === activeIndex;
          return (
            <React.Fragment key={cmd.id}>
              {header && (
                <div role="presentation" className="px-2 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  {header}
                </div>
              )}
              <div
                id={optionId(i)}
                data-index={i}
                role="option"
                aria-selected={isActive}
                onMouseMove={() => setActive(i)}
                onClick={() => runCommand(cmd)}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm rounded-lg cursor-pointer ${
                  isActive
                    ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                    : 'text-stone-700 dark:text-stone-300'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="text-stone-600 dark:text-stone-400 shrink-0" aria-hidden="true">
                    {cmd.icon}
                  </span>
                  <span className="truncate">{cmd.label}</span>
                  {cmd.detail && <span className="text-xs text-stone-600 dark:text-stone-400 truncate">{cmd.detail}</span>}
                </span>
                {cmd.shortcut ? (
                  <kbd className="px-1.5 py-0.5 text-xs font-mono bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-stone-600 dark:text-stone-400 shrink-0">
                    {cmd.shortcut}
                  </kbd>
                ) : isActive ? (
                  <CornerDownLeft className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 shrink-0" aria-hidden="true" />
                ) : null}
              </div>
            </React.Fragment>
          );
        })}

        {results.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-stone-600 dark:text-stone-400 space-y-2">
            <p>No results for “{query}”</p>
            {onNoResultsAction && (
              <button
                onClick={() => {
                  onClose();
                  onNoResultsAction(query.trim());
                }}
                className="px-3 py-1.5 rounded-lg bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold"
              >
                Ask the assistant instead
              </button>
            )}
          </div>
        )}
      </div>

      <div aria-live="polite" className="sr-only">
        {results.length} {results.length === 1 ? 'result' : 'results'}
      </div>

      <div className="px-4 py-2 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400 flex items-center justify-between">
        <span>↑↓ to navigate · Enter to select</span>
        <span>
          <kbd className="font-mono">?</kbd> for shortcuts
        </span>
      </div>
    </>
  );
}
