'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, Play, Pause, Square, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { AppSettings, TtsEngine } from '@/lib/db/types';
import { synthesizeKokoroSpeech } from '@/lib/tts/kokoro';

interface TtsPlayerProps {
  textToRead: string;
  chapterTitle: string;
  settings?: AppSettings;
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

const btn =
  'inline-flex items-center justify-center min-h-8 min-w-8 rounded-lg text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 cursor-pointer';

export function TtsPlayer({ textToRead, chapterTitle, settings }: TtsPlayerProps) {
  const toast = useToast();
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'loading'>('idle');
  const [rate, setRate] = useState(settings?.audioSettings?.playbackRate || 1);
  const [progress, setProgress] = useState({ index: 0, total: 0 });

  const chunksRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const rateRef = useRef(1);
  const runRef = useRef(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const engine: TtsEngine = settings?.audioSettings?.engine || 'local-wasm';
  const voiceId =
    engine === 'gemini-cloud'
      ? settings?.audioSettings?.guideVoice || 'Aoede'
      : settings?.audioSettings?.guideVoice || 'af_heart';

  const stop = useCallback(() => {
    runRef.current += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    indexRef.current = 0;
    setStatus('idle');
    setProgress(p => ({ ...p, index: 0 }));
  }, []);

  const speakFrom = useCallback(
    async (start: number) => {
      const run = ++runRef.current;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      const chunks = chunksRef.current;

      const speakNext = async (i: number) => {
        if (run !== runRef.current) return;
        if (i >= chunks.length) {
          indexRef.current = 0;
          setStatus('idle');
          setProgress(p => ({ ...p, index: 0 }));
          return;
        }

        indexRef.current = i;
        setProgress({ index: i, total: chunks.length });
        const chunkText = chunks[i];

        // 1. Local Neural WASM (Kokoro-82M)
        if (engine === 'local-wasm') {
          try {
            setStatus('loading');
            const { url } = await synthesizeKokoroSpeech(chunkText, voiceId, p => {
              if (p.status === 'downloading') {
                toast({
                  message: `Downloading neural voice model: ${p.progress}%`,
                  tone: 'neutral',
                });
              }
            });

            if (run !== runRef.current) return;

            const audio = new Audio(url);
            audio.playbackRate = rateRef.current;
            currentAudioRef.current = audio;
            setStatus('playing');

            audio.onended = () => speakNext(i + 1);
            audio.onerror = () => {
              if (run === runRef.current) setStatus('idle');
            };

            await audio.play();
          } catch (err) {
            console.error('Local TTS playback error:', err);
            if (run === runRef.current) setStatus('idle');
          }
          return;
        }

        // 2. Gemini Cloud Studio TTS
        if (engine === 'gemini-cloud') {
          try {
            setStatus('loading');
            const res = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: chunkText,
                voice: voiceId,
                model: settings?.audioSettings?.geminiTtsModel || 'gemini-3.8-flash-tts',
              }),
            });
            const json = await res.json();
            if (run !== runRef.current) return;
            if (!res.ok || json.error) throw new Error(json.error || 'Gemini TTS error');

            const audio = new Audio(`data:${json.mimeType || 'audio/mp3'};base64,${json.audio}`);
            audio.playbackRate = rateRef.current;
            currentAudioRef.current = audio;
            setStatus('playing');

            audio.onended = () => speakNext(i + 1);
            audio.onerror = () => {
              if (run === runRef.current) setStatus('idle');
            };

            await audio.play();
          } catch (err) {
            console.error('Gemini TTS error:', err);
            if (run === runRef.current) setStatus('idle');
          }
          return;
        }

        // 3. System Web Speech fallback
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(chunkText);
          u.rate = rateRef.current;
          u.onend = () => speakNext(i + 1);
          u.onerror = e => {
            if (run === runRef.current && (e as SpeechSynthesisErrorEvent).error !== 'interrupted') {
              setStatus('idle');
            }
          };
          setStatus('playing');
          window.speechSynthesis.speak(u);
        }
      };

      await speakNext(start);
    },
    [engine, voiceId, settings?.audioSettings?.geminiTtsModel, toast]
  );

  // Stop when text changes or unmounts
  useEffect(() => {
    chunksRef.current = [];
    return () => {
      runRef.current += 1;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, [textToRead]);

  const play = () => {
    if (status === 'paused') {
      if (currentAudioRef.current) {
        currentAudioRef.current.play();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
      setStatus('playing');
      return;
    }
    chunksRef.current = toChunks(textToRead);
    setProgress({ index: 0, total: chunksRef.current.length });
    speakFrom(0);
  };

  const pause = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    setStatus('paused');
  };

  const changeRate = (r: number) => {
    setRate(r);
    rateRef.current = r;
    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = r;
    }
    if (status === 'playing') {
      speakFrom(indexRef.current);
    }
  };

  return (
    <div
      role="group"
      aria-label={`Read aloud: ${chapterTitle}`}
      className="flex items-center gap-1.5 px-2 py-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl text-xs text-stone-700 dark:text-stone-300"
    >
      {engine === 'local-wasm' ? (
        <span title="Natural Local WASM Voice" className="inline-flex items-center">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        </span>
      ) : (
        <Volume2 className="w-4 h-4 text-stone-600 dark:text-stone-400 shrink-0" aria-hidden="true" />
      )}

      {status === 'loading' ? (
        <button disabled className={btn} title="Synthesizing natural voice...">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
        </button>
      ) : status === 'playing' ? (
        <button onClick={pause} aria-label="Pause reading" title="Pause reading" className={btn}>
          <Pause className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={play}
          aria-label={status === 'paused' ? 'Resume reading' : 'Read chapter aloud'}
          title={`Read aloud with ${engine === 'local-wasm' ? 'Natural Local Voice' : engine === 'gemini-cloud' ? 'Gemini Studio Voice' : 'System Voice'}`}
          className={btn}
        >
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

      <div
        role="group"
        aria-label="Reading speed"
        className="flex items-center gap-0.5 border-l border-stone-200 dark:border-stone-700 pl-1.5"
      >
        {RATES.map(r => (
          <button
            key={r}
            onClick={() => changeRate(r)}
            aria-pressed={rate === r}
            className={`min-h-8 min-w-8 px-1.5 rounded-lg text-xs font-medium cursor-pointer ${
              rate === r
                ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 font-bold'
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
