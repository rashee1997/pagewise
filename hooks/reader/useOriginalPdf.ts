import { useCallback, useEffect, useRef, useState } from 'react';
import { getPdfBlob } from '@/lib/db';

/**
 * Original-PDF view state. The stored blob is loaded when the view is opened and exposed as a
 * per-session object URL, which is revoked when the view closes or the reader unmounts.
 */
export function useOriginalPdf(bookId: string) {
  const [isViewing, setIsViewing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfState, setPdfState] = useState<'idle' | 'loading' | 'missing'>('idle');
  const urlRef = useRef<string | null>(null);
  const requestRef = useRef(0);

  const release = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  const close = useCallback(() => {
    requestRef.current += 1;
    release();
    setPdfUrl(null);
    setPdfState('idle');
    setIsViewing(false);
  }, [release]);

  const open = useCallback(async () => {
    const request = ++requestRef.current;
    setIsViewing(true);
    setPdfState('loading');
    const blob = await getPdfBlob(bookId);
    if (request !== requestRef.current) return; // closed or re-opened meanwhile
    if (!blob) {
      setPdfState('missing');
      return;
    }
    release();
    urlRef.current = URL.createObjectURL(blob);
    setPdfUrl(urlRef.current);
    setPdfState('idle');
  }, [bookId, release]);

  const toggle = useCallback(() => (isViewing ? close() : void open()), [isViewing, open, close]);

  useEffect(() => release, [release]);

  return { isViewing, pdfUrl, pdfState, toggle };
}
