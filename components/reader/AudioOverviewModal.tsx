'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Book, Chapter, AppSettings, AudioOverviewData, AudioDialogueTurn, TtsEngine } from '@/lib/db/types';
import { getChapterMaterial, saveChapterMaterial, saveGenerationRecord } from '@/lib/db';
import {
  Headphones,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Volume2,
  Sparkles,
  Loader2,
  X,
  Radio,
  Cpu,
  Cloud,
} from 'lucide-react';
import {
  synthesizeKokoroSpeech,
  KokoroLoadProgress,
  getCompatibleVoiceId,
} from '@/lib/tts/kokoro';

interface AudioOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  chapter: Chapter;
  settings: AppSettings;
}

export function AudioOverviewModal({
  isOpen,
  onClose,
  book,
  chapter,
  settings,
}: AudioOverviewModalProps) {
  const [data, setData] = useState<AudioOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [rate, setRate] = useState<number>(settings.audioSettings?.playbackRate || 1.0);
  const [selectedEngine, setSelectedEngine] = useState<TtsEngine | null>(null);
  const engine: TtsEngine = selectedEngine || settings.audioSettings?.engine || 'local-wasm';
  const [downloadProgress, setDownloadProgress] = useState<KokoroLoadProgress | null>(null);

  const activeTurnRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Record<string, string>>({}); // key: `${engine}_${turnIndex}_${rate}` -> blob url
  const playTurnRef = useRef<(turnIndex: number, turnsList?: AudioDialogueTurn[]) => void>(() => {});

  const stopAudio = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsPlaying(false);
    setIsSynthesizing(false);
  }, []);

  // Load from database cache on open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    (async () => {
      try {
        const cached = await getChapterMaterial<AudioOverviewData>(chapter.id, 'audioOverview');
        if (cached && isMounted) {
          setData(cached);
          setCurrentTurn(0);
        } else if (isMounted) {
          setData(null);
        }
      } catch (e) {
        console.error('Failed to load cached audio overview:', e);
      }
    })();

    return () => {
      isMounted = false;
      stopAudio();
    };
  }, [isOpen, chapter.id, stopAudio]);

  const handleGenerate = async () => {
    stopAudio();
    setIsLoading(true);
    setError(null);
    audioCacheRef.current = {};
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'audioOverview',
          chapterText: chapter.text,
          bookTitle: book.title,
          author: book.author,
          chapterTitle: chapter.title,
          provider: settings.provider,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to generate audio overview.');
      }

      if (json.data && Array.isArray(json.data.turns) && json.data.turns.length > 0) {
        const payload: AudioOverviewData = {
          title: json.data.title || `Deep Dive: ${chapter.title}`,
          durationEstimate: json.data.durationEstimate || '4 min',
          turns: json.data.turns,
        };

        setData(payload);
        setCurrentTurn(0);

        // Save to cache
        await saveChapterMaterial(book.id, chapter.id, 'audioOverview', payload);
        await saveGenerationRecord({
          id: `rec_${chapter.id}_audioOverview_${Date.now()}`,
          bookId: book.id,
          chapterId: chapter.id,
          kind: 'audioOverview',
          inputHash: chapter.textHash || '',
          promptVersion: '1.0',
          batch: 1,
          createdAt: Date.now(),
        });
      } else {
        throw new Error('Unexpected audio overview response format.');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not generate audio overview.');
    } finally {
      setIsLoading(false);
    }
  };

  // Play a specific turn via chosen TTS engine (Local Kokoro WASM, Gemini Studio Cloud, or System Web Speech)
  const playTurn = useCallback(
    async (turnIndex: number, turnsList?: AudioDialogueTurn[]) => {
      const list = turnsList || data?.turns;
      if (!list || turnIndex >= list.length || turnIndex < 0) {
        stopAudio();
        return;
      }

      stopAudio();
      setCurrentTurn(turnIndex);
      setIsPlaying(true);

      const turn = list[turnIndex];
      const isGuide = turn.speaker === 'guide';
      const cacheKey = `${engine}_${turnIndex}_${rate}`;

      // 1. Local Neural WASM (Kokoro-82M)
      if (engine === 'local-wasm') {
        const rawGuide = settings.audioSettings?.guideVoice || 'af_heart';
        const rawAnalyst = settings.audioSettings?.analystVoice || 'am_adam';
        const voiceId = getCompatibleVoiceId('local-wasm', isGuide ? rawGuide : rawAnalyst, isGuide);

        try {
          let audioUrl = audioCacheRef.current[cacheKey];

          if (!audioUrl) {
            setIsSynthesizing(true);
            const { url } = await synthesizeKokoroSpeech(turn.text, voiceId, p => {
              setDownloadProgress(p);
            });
            audioUrl = url;
            audioCacheRef.current[cacheKey] = url;
          }

          setIsSynthesizing(false);

          const audio = new Audio(audioUrl);
          audio.playbackRate = rate;
          currentAudioRef.current = audio;

          audio.onended = () => {
            if (turnIndex + 1 < list.length) {
              playTurnRef.current(turnIndex + 1, list);
            } else {
              setIsPlaying(false);
            }
          };

          audio.onerror = e => {
            console.warn('Audio playback error:', e);
            setIsPlaying(false);
            setIsSynthesizing(false);
          };

          await audio.play();
        } catch (err: any) {
          console.error('Local Kokoro WASM generation error:', err);
          setIsSynthesizing(false);
          setIsPlaying(false);
          setError(`Local audio synthesis error: ${err?.message || 'Unknown error'}`);
        }
        return;
      }

      // 2. Gemini Cloud Studio TTS (gemini-3.8-flash-tts)
      if (engine === 'gemini-cloud') {
        const rawGuide = settings.audioSettings?.guideVoice || 'Aoede';
        const rawAnalyst = settings.audioSettings?.analystVoice || 'Fenrir';
        const cloudVoice = getCompatibleVoiceId('gemini-cloud', isGuide ? rawGuide : rawAnalyst, isGuide);
        const cloudModel = settings.audioSettings?.geminiTtsModel || 'gemini-3.8-flash-tts';

        try {
          let audioUrl = audioCacheRef.current[cacheKey];

          if (!audioUrl) {
            setIsSynthesizing(true);
            const res = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: turn.text,
                voice: cloudVoice,
                model: cloudModel,
              }),
            });
            const json = await res.json();
            if (!res.ok || json.error) throw new Error(json.error || 'Gemini TTS synthesis failed');

            audioUrl = `data:${json.mimeType || 'audio/mp3'};base64,${json.audio}`;
            audioCacheRef.current[cacheKey] = audioUrl;
          }

          setIsSynthesizing(false);

          const audio = new Audio(audioUrl);
          audio.playbackRate = rate;
          currentAudioRef.current = audio;

          audio.onended = () => {
            if (turnIndex + 1 < list.length) {
              playTurnRef.current(turnIndex + 1, list);
            } else {
              setIsPlaying(false);
            }
          };

          audio.onerror = () => {
            setIsPlaying(false);
            setIsSynthesizing(false);
          };

          await audio.play();
        } catch (err: any) {
          console.error('Gemini Cloud TTS error:', err);
          setIsSynthesizing(false);
          setIsPlaying(false);
          setError(`Gemini TTS error: ${err?.message || 'Unknown error'}`);
        }
        return;
      }

      // 3. Fallback: System Web Speech API
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(turn.text);
        utterance.rate = rate;

        const voices = window.speechSynthesis.getVoices();
        const enVoices = voices.filter(v => v.lang.startsWith('en'));

        if (turn.speaker === 'analyst') {
          utterance.pitch = 1.15;
          if (enVoices.length > 1) utterance.voice = enVoices[1];
        } else {
          utterance.pitch = 0.95;
          if (enVoices.length > 0) utterance.voice = enVoices[0];
        }

        utterance.onend = () => {
          if (turnIndex + 1 < list.length) {
            playTurnRef.current(turnIndex + 1, list);
          } else {
            setIsPlaying(false);
          }
        };

        utterance.onerror = e => {
          if (e.error !== 'canceled') console.warn('SpeechSynthesis error:', e);
          setIsPlaying(false);
        };

        window.speechSynthesis.speak(utterance);
      }
    },
    [data, rate, engine, settings.audioSettings, stopAudio]
  );

  useEffect(() => {
    playTurnRef.current = playTurn;
  }, [playTurn]);

  const togglePlay = () => {
    if (isPlaying) {
      stopAudio();
    } else if (data && data.turns.length > 0) {
      playTurn(currentTurn);
    }
  };

  const skipForward = () => {
    if (!data) return;
    const next = Math.min(data.turns.length - 1, currentTurn + 1);
    playTurn(next);
  };

  const skipBack = () => {
    if (!data) return;
    const prev = Math.max(0, currentTurn - 1);
    playTurn(prev);
  };

  // Autoscroll transcript to active speaker
  useEffect(() => {
    activeTurnRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [currentTurn]);

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        stopAudio();
        onClose();
      }}
      title="Audio Briefing (Two-Host Podcast)"
      hideTitle
      panelClassName="w-full max-w-2xl max-h-[90dvh] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-900 dark:text-stone-100 animate-in zoom-in-95 duration-200"
    >
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0 bg-stone-50/50 dark:bg-stone-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                {data ? data.title : 'Chapter Audio Overview'}
              </h2>
              {data && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">
                  {data.durationEstimate}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Two-Host Conversational Deep Dive · {chapter.title}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            stopAudio();
            onClose();
          }}
          aria-label="Close audio overview"
          className="p-2 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Engine Switcher Bar */}
      <div className="px-4 py-2 bg-stone-100/70 dark:bg-stone-800/50 border-b border-stone-200/80 dark:border-stone-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-stone-600 dark:text-stone-400">
          <span>Voice Engine:</span>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-stone-900 p-0.5 rounded-xl border border-stone-200 dark:border-stone-800 text-[11px] font-semibold">
          <button
            onClick={() => {
              stopAudio();
              setSelectedEngine('local-wasm');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              engine === 'local-wasm'
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 shadow-2xs font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Cpu className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Local WASM (Natural)</span>
          </button>
          <button
            onClick={() => {
              stopAudio();
              setSelectedEngine('gemini-cloud');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              engine === 'gemini-cloud'
                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 shadow-2xs font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Cloud className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>Gemini Studio TTS</span>
          </button>
          <button
            onClick={() => {
              stopAudio();
              setSelectedEngine('system');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              engine === 'system'
                ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Volume2 className="w-3 h-3" />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* First-time download progress banner (for local WASM) */}
      {downloadProgress && downloadProgress.status === 'downloading' && (
        <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/50 text-xs space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between text-amber-900 dark:text-amber-200 font-semibold text-[11px]">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
              <span>{downloadProgress.message || 'Downloading local neural voice model (~80MB)...'}</span>
            </span>
            <span>{downloadProgress.progress}%</span>
          </div>
          <div className="w-full bg-amber-200/60 dark:bg-amber-900/50 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-600 dark:bg-amber-400 h-full transition-all duration-150"
              style={{ width: `${downloadProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Content / Transcript Area */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
        {isLoading && (
          <div className="py-20 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto animate-pulse">
              <Headphones className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Generating Conversational Audio Briefing...
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                Alex (The Guide) and Morgan (The Analyst) are synthesizing chapter themes into an analytical dialogue.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing full chapter context...</span>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl text-xs text-red-800 dark:text-red-300 space-y-2">
            <p className="font-semibold">Playback error</p>
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null);
                handleGenerate();
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-xs shadow-2xs"
            >
              Retry Generation
            </button>
          </div>
        )}

        {!isLoading && !data && !error && (
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Headphones className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Listen to a 2-Host Deep Dive
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Transform this chapter into a lively, podcast-style audio conversation between Alex and Morgan. Powered by natural local in-browser neural voice synthesis and Gemini 3.8 Studio TTS.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-5 py-3 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 font-semibold text-xs sm:text-sm rounded-2xl shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400 dark:text-amber-600" />
              <span>Generate Audio Overview</span>
            </button>
          </div>
        )}

        {/* Live Transcript when data is ready */}
        {!isLoading && data && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 text-xs text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <span>Interactive Dialogue Transcript</span>
                {isSynthesizing && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Synthesizing voice...</span>
                  </span>
                )}
              </div>
              <button
                onClick={handleGenerate}
                className="inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
                title="Regenerate episode script"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Regenerate Script</span>
              </button>
            </div>

            <div className="space-y-3">
              {data.turns.map((turn, idx) => {
                const isActive = idx === currentTurn;
                const isGuide = turn.speaker === 'guide';
                return (
                  <div
                    key={idx}
                    ref={isActive ? activeTurnRef : null}
                    onClick={() => playTurn(idx)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                      isActive
                        ? 'border-amber-400 dark:border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs ring-1 ring-amber-400/50'
                        : 'border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 hover:border-stone-300 dark:hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isGuide
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          }`}
                        >
                          {isGuide ? 'A' : 'M'}
                        </span>
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                          {turn.speakerName}
                        </span>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                          {isSynthesizing ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Loading Voice</span>
                            </>
                          ) : isPlaying ? (
                            <>
                              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                              <span>Speaking</span>
                            </>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <p
                      className={`text-xs sm:text-sm leading-relaxed ${
                        isActive
                          ? 'text-stone-950 dark:text-stone-50 font-medium'
                          : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {turn.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Persistent Audio Player Controls Footer */}
      {!isLoading && data && (
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                Turn {currentTurn + 1} of {data.turns.length}
              </span>
              <div className="flex items-center gap-1 bg-stone-200/80 dark:bg-stone-800 p-0.5 rounded-lg text-xs font-semibold">
                {[1.0, 1.25, 1.5].map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      setRate(r);
                      if (currentAudioRef.current) {
                        currentAudioRef.current.playbackRate = r;
                      }
                      if (isPlaying) playTurn(currentTurn);
                    }}
                    className={`px-2 py-0.5 rounded-md transition-colors ${
                      rate === r
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={skipBack}
                disabled={currentTurn === 0}
                aria-label="Previous speaker"
                className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="p-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 shadow-md transition-all cursor-pointer"
              >
                {isSynthesizing ? (
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400 dark:text-amber-600" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>

              <button
                onClick={skipForward}
                disabled={currentTurn >= data.turns.length - 1}
                aria-label="Next speaker"
                className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
