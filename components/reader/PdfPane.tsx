'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface PdfPaneProps {
  url: string | null;
  state: 'idle' | 'loading' | 'missing';
  title: string;
}

/** Original-PDF viewer pane with loading and "not stored" states. */
export function PdfPane({ url, state, title }: PdfPaneProps) {
  return (
    <div className="w-full h-[80dvh] max-w-5xl mx-auto rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-md bg-stone-100 dark:bg-stone-900 flex items-center justify-center">
      {state === 'loading' && (
        <p className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400" role="status">
          <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Loading PDF…
        </p>
      )}
      {state === 'missing' && (
        <p className="text-sm text-stone-700 dark:text-stone-300 text-center px-6">
          The original file isn’t stored for this book. Re-upload the PDF to enable this view.
        </p>
      )}
      {url && <iframe src={url} className="w-full h-full border-none" title={title} />}
    </div>
  );
}
