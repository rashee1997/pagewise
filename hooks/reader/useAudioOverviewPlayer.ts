'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AppSettings, AudioOverviewData, AudioDialogueTurn, TtsEngine } from '@/lib/db/types';
import { synthesizeKokoroSpeech, KokoroLoadProgress, getCompatibleVoiceId } from '@/lib/tts/kokoro';

interface UseAudioOverviewPlayerProps {
  data: AudioOverviewData | null;
  settings: AppSettings;
  engine: TtsEngine;
  onSynthesisError: (err: string) => void;
  onDownloadProgress: (p: KokoroLoadProgress | null) => void;
}

export function useAudioOverviewPlayer({
  data,
  settings,
  engine,
  onSynthesisError,
  onDownloadProgress,
}: UseAudioOverviewPlayerProps) {
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [rate, setRate] = useState<number>(settings.audioSettings?.playbackRate || 1.0);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Record<string, string>>({}); // key: `${engine}_${turnIndex}_${rate}`
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
              onDownloadProgress(p);
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
          onSynthesisError(`Local audio synthesis error: ${err?.message || 'Unknown error'}`);
        }
        return;
      }

      // 2. Gemini Cloud Studio TTS
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
          onSynthesisError(`Gemini TTS error: ${err?.message || 'Unknown error'}`);
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
    [data, rate, engine, settings.audioSettings, stopAudio, onSynthesisError, onDownloadProgress]
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

  const updateRate = (newRate: number) => {
    setRate(newRate);
    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = newRate;
    }
    if (isPlaying) {
      playTurn(currentTurn);
    }
  };

  const clearCache = () => {
    audioCacheRef.current = {};
  };

  return {
    currentTurn,
    setCurrentTurn,
    isPlaying,
    isSynthesizing,
    rate,
    updateRate,
    stopAudio,
    playTurn,
    togglePlay,
    skipForward,
    skipBack,
    clearCache,
  };
}
