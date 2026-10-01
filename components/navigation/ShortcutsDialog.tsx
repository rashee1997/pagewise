'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';

const SECTIONS: Array<{ title: string; items: Array<[string, string]> }> = [
  {
    title: 'Everywhere',
    items: [
      ['Ctrl/⌘ + K', 'Open command menu'],
      ['?', 'Show this help'],
    ],
  },
  {
    title: 'Reader',
    items: [
      ['Ctrl/⌘ + J', 'Toggle AI assistant'],
      ['[  /  ]', 'Previous / next chapter'],
      ['1 – 7', 'Switch study mode'],
      ['F', 'Toggle focus mode'],
      ['N', 'Add note to selected text'],
      ['Esc', 'Close panel / exit focus mode'],
    ],
  },
  {
    title: 'Flashcard review',
    items: [
      ['Space', 'Show / hide answer'],
      ['1 2 3 4', 'Again · Hard · Good · Easy'],
      ['Z', 'Undo last rating'],
    ],
  },
];

export function ShortcutsDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard shortcuts"
      panelClassName="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 space-y-5 max-h-[85dvh] overflow-y-auto"
    >
      {SECTIONS.map(section => (
        <section key={section.title} aria-label={section.title}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-2">
            {section.title}
          </h3>
          <dl className="space-y-1.5">
            {section.items.map(([keys, desc]) => (
              <div key={keys} className="flex items-center justify-between gap-4 text-sm">
                <dt className="text-stone-700 dark:text-stone-300">{desc}</dt>
                <dd>
                  <kbd className="px-1.5 py-0.5 text-xs font-mono bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-stone-700 dark:text-stone-300 whitespace-nowrap">
                    {keys}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 text-sm font-semibold rounded-xl"
        >
          Close
        </button>
      </div>
    </Dialog>
  );
}
