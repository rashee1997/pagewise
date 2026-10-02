'use client';

import React, { useState, useEffect } from 'react';
import { AudioSettings } from '@/lib/db/types';
import { Play, Pause } from 'lucide-react';
import { KOKORO_VOICES, synthesizeKokoroSpeech } from '@/lib/tts/kokoro';
import { GEMINI_VOICES } from './audioConstants';

interface HostVoiceSelectorProps {
  currentAudio: AudioSettings;
  onUpdateAudio: (partial: Partial<AudioSettings>) => Promise<void>;
}

export function HostVoiceSelector({ currentAudio, onUpdateAudio }: HostVoiceSelectorProps) {
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [previewAudio]);

  const handlePreviewVoice = async (voiceId: string, speakerName: string) => {
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
    }

    if (previewingVoice === voiceId) {
      setPreviewingVoice(null);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    setPreviewingVoice(voiceId);
    const sampleText = `Hello, I'm ${speakerName}. Welcome to the Pagewise chapter deep dive.`;

    try {
      if (currentAudio.engine === 'local-wasm') {
        const { url } = await synthesizeKokoroSpeech(sampleText, voiceId);
        const audio = new Audio(url);
        setPreviewAudio(audio);
        audio.onended = () => setPreviewingVoice(null);
        audio.onerror = () => setPreviewingVoice(null);
        await audio.play();
      } else if (currentAudio.engine === 'gemini-cloud') {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: sampleText,
            voice: voiceId,
            model: currentAudio.geminiTtsModel || 'gemini-3.8-flash-tts',
          }),
        });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || 'TTS error');

        const audio = new Audio(`data:${json.mimeType || 'audio/mp3'};base64,${json.audio}`);
        setPreviewAudio(audio);
        audio.onended = () => setPreviewingVoice(null);
        audio.onerror = () => setPreviewingVoice(null);
        await audio.play();
      } else {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(sampleText);
          u.onend = () => setPreviewingVoice(null);
          u.onerror = () => setPreviewingVoice(null);
          window.speechSynthesis.speak(u);
        }
      }
    } catch (err) {
      console.error('Failed to preview voice:', err);
      setPreviewingVoice(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
      {/* Host A (The Guide) */}
      <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
              Host A: Alex (The Guide)
            </span>
            <span className="text-xs text-stone-600 dark:text-stone-400">
              Frames concepts, context, and core questions
            </span>
          </div>
          <button
            type="button"
            onClick={() => handlePreviewVoice(currentAudio.customVoiceId || currentAudio.guideVoice, 'Alex')}
            aria-label="Preview Alex voice"
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {previewingVoice === (currentAudio.customVoiceId || currentAudio.guideVoice) ? (
              <Pause className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            ) : (
              <Play className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            )}
            <span className="text-xs">Preview</span>
          </button>
        </div>

        <label className="sr-only" htmlFor="guide-voice-select">
          Alex Voice
        </label>
        <select
          id="guide-voice-select"
          value={currentAudio.guideVoice}
          onChange={e => onUpdateAudio({ guideVoice: e.target.value })}
          className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-medium text-stone-900 dark:text-stone-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {currentAudio.engine === 'local-wasm'
            ? KOKORO_VOICES.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.accent} {v.gender}) · {v.description}
                </option>
              ))
            : currentAudio.engine === 'gemini-cloud'
            ? GEMINI_VOICES.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.gender}) · {v.desc}
                </option>
              ))
            : (
              <option value="system-guide">System Default Voice (Guide)</option>
            )}
        </select>
      </div>

      {/* Host B (The Analyst) */}
      <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
              Host B: Morgan (The Analyst)
            </span>
            <span className="text-xs text-stone-600 dark:text-stone-400">
              Nuance, analogies, and practical critique
            </span>
          </div>
          <button
            type="button"
            onClick={() => handlePreviewVoice(currentAudio.analystVoice, 'Morgan')}
            aria-label="Preview Morgan voice"
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {previewingVoice === currentAudio.analystVoice ? (
              <Pause className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            ) : (
              <Play className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            )}
            <span className="text-xs">Preview</span>
          </button>
        </div>

        <label className="sr-only" htmlFor="analyst-voice-select">
          Morgan Voice
        </label>
        <select
          id="analyst-voice-select"
          value={currentAudio.analystVoice}
          onChange={e => onUpdateAudio({ analystVoice: e.target.value })}
          className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-medium text-stone-900 dark:text-stone-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {currentAudio.engine === 'local-wasm'
            ? KOKORO_VOICES.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.accent} {v.gender}) · {v.description}
                </option>
              ))
            : currentAudio.engine === 'gemini-cloud'
            ? GEMINI_VOICES.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.gender}) · {v.desc}
                </option>
              ))
            : (
              <option value="system-analyst">System Default Voice (Analyst)</option>
            )}
        </select>
      </div>
    </div>
  );
}
