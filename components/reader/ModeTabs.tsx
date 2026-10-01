'use client';

import React, { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/reader/text';
import { MODE_BUTTONS, ReaderMode } from './readerModes';

interface ModeTabsProps {
  active: ReaderMode;
  onChange: (m: ReaderMode) => void;
}

/** WAI-ARIA tabs: roving tabindex, ←/→/Home/End, active tab scrolled into view on narrow screens. */
export function ModeTabs({ active, onChange }: ModeTabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    refs.current[active]?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = MODE_BUTTONS.findIndex(m => m.id === active);
    let next = -1;
    if (e.key === 'ArrowRight') next = (idx + 1) % MODE_BUTTONS.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + MODE_BUTTONS.length) % MODE_BUTTONS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = MODE_BUTTONS.length - 1;
    if (next >= 0) {
      e.preventDefault();
      const id = MODE_BUTTONS[next].id;
      onChange(id);
      refs.current[id]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Study modes"
      onKeyDown={onKeyDown}
      className="flex items-center gap-1 px-4 py-2 border-t border-stone-200 dark:border-stone-800 overflow-x-auto no-scrollbar snap-x lg:justify-center"
    >
      {MODE_BUTTONS.map((btn, i) => {
        const selected = active === btn.id;
        return (
          <button
            key={btn.id}
            ref={el => {
              refs.current[btn.id] = el;
            }}
            role="tab"
            id={`tab-${btn.id}`}
            aria-selected={selected}
            aria-controls="reader-panel"
            aria-keyshortcuts={String(i + 1)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(btn.id)}
            className={`flex items-center gap-1.5 text-xs font-medium whitespace-nowrap snap-center px-3 py-2 min-h-9 rounded-lg ${
              selected
                ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            {btn.icon}
            <span>{btn.label}</span>
          </button>
        );
      })}
    </div>
  );
}
