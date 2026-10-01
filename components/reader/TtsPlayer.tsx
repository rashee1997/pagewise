'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Play, Pause, Square, VolumeX } from 'lucide-react';

interface TtsPlayerProps {
  textToRead: string;
  chapterTitle: string;
}

export function TtsPlayer({ textToRead, chapterTitle }: TtsPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
        if (available.length > 0) {
          const defaultVoice = available.find(v => v.lang.startsWith('en') && !v.name.includes('Google')) || available[0];
          if (defaultVoice) {
            setSelectedVoice(prev => prev || defaultVoice.name);
          }
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlay = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean text for speech
    const cleanText = textToRead.replace(/[*_#`[\]]/g, ' ').slice(0, 8000);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = rate;

    if (selectedVoice) {
      const voiceObj = voices.find(v => v.name === selectedVoice);
      if (voiceObj) utterance.voice = voiceObj;
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (isPlaying) {
      handleStop();
      setTimeout(handlePlay, 100);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 dark:bg-stone-800/80 rounded-xl text-xs text-stone-700 dark:text-stone-300">
      <Volume2 className="w-4 h-4 text-stone-500 shrink-0" />

      {/* Play/Pause */}
      {isPlaying ? (
        <button
          onClick={handlePause}
          className="p-1 text-stone-800 dark:text-stone-200 hover:text-stone-950 dark:hover:text-white"
          title="Pause reading"
        >
          <Pause className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={handlePlay}
          className="p-1 text-stone-800 dark:text-stone-200 hover:text-stone-950 dark:hover:text-white"
          title="Read aloud"
        >
          <Play className="w-4 h-4" />
        </button>
      )}

      {(isPlaying || isPaused) && (
        <button
          onClick={handleStop}
          className="p-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          title="Stop reading"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Speed Rate */}
      <div className="flex items-center gap-1 border-l border-stone-200 dark:border-stone-700 pl-2">
        {[1, 1.25, 1.5].map(r => (
          <button
            key={r}
            onClick={() => handleRateChange(r)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              rate === r
                ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {r}x
          </button>
        ))}
      </div>
    </div>
  );
}
