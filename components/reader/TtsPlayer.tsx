'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, Play, Pause, Square } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface TtsPlayerProps {
  textToRead: string;
  chapterTitle: string;
}

const RATES = [1, 1.25, 1.5];

/** Split text into sentence-aligned chunks (<= ~220 chars) so long chapters read fully and resume cleanly. */
function toChunks(text: string): string[] {
  const clean = text.replace(/[*_#`[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  const sentences = clean.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [clean];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > 220 && cur) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur += (cur ? ' ' : '') + s.trim();
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter(Boolean);
}

const btn = 'inline-flex items-center justify-center min-h-8 min-w-8 rounded-lg text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700';

/** Read-aloud player: sentence-chunk queue with progress, pause/resume, stop and speed control. */
export function TtsPlayer({ textToRead, chapterTitle }: TtsPlayerProps) {
  const toast = useToast();
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [rate, setRate] = useState(1);
  const [progress, setProgress] = useState({ index: 0, total: 0 });
  const chunksRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const rateRef = useRef(1);
  const runRef = useRef(0); // invalidates stale utterance callbacks

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stop = useCallback(() => {
    runRef.current += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    indexRef.current = 0;
    setStatus('idle');
    setProgress(p => ({ ...p, index: 0 }));
  }, []);

  const speakFrom = useCallback((start: number) => {
    const run = ++runRef.current;
    window.speechSynthesis.cancel();
    const chunks = chunksRef.current;

    const speakNext = (i: number) => {
      if (run !== runRef.current) return;
      if (i >= chunks.length) {
        indexRef.current = 0;
        setStatus('idle');
        setProgress(p => ({ ...p, index: 0 }));
        return;
      }
      indexRef.current = i;
      setProgress({ index: i, total: chunks.length });
      const u = new SpeechSynthesisUtterance(chunks[i]);
      u.rate = rateRef.current;
      u.onend = () => speakNext(i + 1);
      u.onerror = e => {
        if (run === runRef.current && (e as SpeechSynthesisErrorEvent).error !== 'interrupted') {
          setStatus('idle');
        }
      };
      window.speechSynthesis.speak(u);
    };
    setStatus('playing');
    speakNext(start);
  }, []);

  // Stop when the chapter changes or the player unmounts
  useEffect(() => {
    chunksRef.current = [];
    return () => {
      runRef.current += 1;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [textToRead]);

  const play = () => {
    if (!supported) {
      toast({ message: 'Read aloud isn’t supported in this browser.', tone: 'error' });
      return;
    }
    if (status === 'paused') {
      window.speechSynthesis.resume();
      setStatus('playing');
      return;
    }
    chunksRef.current = toChunks(textToRead);
    setProgress({ index: 0, total: chunksRef.current.length });
    speakFrom(0);
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setStatus('paused');
  };

  const changeRate = (r: number) => {
    setRate(r);
    rateRef.current = r;
    if (status === 'playing') speakFrom(indexRef.current); // resume from the current sentence at the new speed
  };

  return (
    <div
      role="group"
      aria-label={`Read aloud: ${chapterTitle}`}
      className="flex items-center gap-1.5 px-2 py-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl text-xs text-stone-700 dark:text-stone-300"
    >
      <Volume2 className="w-4 h-4 text-stone-600 dark:text-stone-400 shrink-0" aria-hidden="true" />

      {status === 'playing' ? (
        <button onClick={pause} aria-label="Pause reading" title="Pause reading" className={btn}>
          <Pause className="w-4 h-4" />
        </button>
      ) : (
        <button onClick={play} aria-label={status === 'paused' ? 'Resume reading' : 'Read chapter aloud'} title="Read aloud" className={btn}>
          <Play className="w-4 h-4" />
        </button>
      )}

      {status !== 'idle' && (
        <>
          <button onClick={stop} aria-label="Stop reading" title="Stop reading" className={btn}>
            <Square className="w-3.5 h-3.5" />
          </button>
          <span className="tabular-nums text-stone-600 dark:text-stone-400" role="status">
            {progress.index + 1}/{progress.total}
          </span>
        </>
      )}

      <div role="group" aria-label="Reading speed" className="flex items-center gap-0.5 border-l border-stone-200 dark:border-stone-700 pl-1.5">
        {RATES.map(r => (
          <button
            key={r}
            onClick={() => changeRate(r)}
            aria-pressed={rate === r}
            className={`min-h-8 min-w-8 px-1.5 rounded-lg text-xs font-medium ${
              rate === r
                ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            {r}x
          </button>
        ))}
      </div>
    </div>
  );
}
