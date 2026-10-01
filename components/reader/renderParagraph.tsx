import React from 'react';
import { Note } from '@/lib/db/types';
import { normalizeQuote } from '@/lib/reader/text';

/** Wrap saved quotes found in a paragraph with <mark>. Overlaps are skipped. */
export function renderParagraph(para: string, notes: Note[]): React.ReactNode {
  const ranges: Array<{ start: number; end: number; note: Note }> = [];
  for (const n of notes) {
    if (!n.quote) continue;
    const q = normalizeQuote(n.quote);
    const start = para.indexOf(q);
    if (start < 0) continue;
    ranges.push({ start, end: start + q.length, note: n });
  }
  if (ranges.length === 0) return para;
  ranges.sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start < cursor) continue;
    if (r.start > cursor) out.push(para.slice(cursor, r.start));
    out.push(
      <mark
        key={r.note.id}
        id={`hl-${r.note.id}`}
        title={r.note.text || undefined}
        className={`rounded-xs px-0.5 bg-amber-200 text-stone-900 dark:bg-amber-700/60 dark:text-stone-50 underline underline-offset-4 decoration-amber-700 dark:decoration-amber-300 ${
          r.note.text ? 'decoration-2' : 'decoration-1'
        }`}
      >
        {para.slice(r.start, r.end)}
        {r.note.text && <span className="sr-only"> (note: {r.note.text})</span>}
      </mark>
    );
    cursor = r.end;
  }
  if (cursor < para.length) out.push(para.slice(cursor));
  return out;
}
