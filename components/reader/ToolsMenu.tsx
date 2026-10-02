'use client';

import React, { useEffect, useRef } from 'react';

export interface ToolsMenuItem {
  label: string;
  icon: React.ReactNode;
  run: () => void;
  hidden?: boolean;
}

export function ToolsMenu({
  items,
  onClose,
}: {
  items: ToolsMenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = items.filter(i => !i.hidden);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const els = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      onClose();
    }
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Reader tools"
      onKeyDown={onKeyDown}
      className="absolute right-0 top-full mt-1 w-56 z-(--z-popover) bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl p-1"
    >
      {visible.map(item => (
        <button
          key={item.label}
          role="menuitem"
          onClick={() => {
            onClose();
            item.run();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 min-h-11 text-sm text-left rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          <span className="text-stone-600 dark:text-stone-400" aria-hidden="true">
            {item.icon}
          </span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
