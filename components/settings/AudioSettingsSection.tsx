'use client';

import React from 'react';
import { AppSettings, AudioSettings } from '@/lib/db/types';
import { updateAppSettings } from '@/lib/db';
import { Volume2, Cpu, Cloud, Radio, Sparkles } from 'lucide-react';
import { KokoroModelManager } from './audio/KokoroModelManager';
import { HostVoiceSelector } from './audio/HostVoiceSelector';

export interface AudioSettingsSectionProps {
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

export function AudioSettingsSection({ settings, onUpdateSettings }: AudioSettingsSectionProps) {
  const currentAudio: AudioSettings = settings.audioSettings || {
    engine: 'local-wasm',
    guideVoice: 'af_heart',
    analystVoice: 'am_adam',
    playbackRate: 1.0,
    geminiTtsModel: 'gemini-3.8-flash-tts',
    customKokoroModelId: 'onnx-community/Kokoro-82M-ONNX',
    customVoiceId: '',
  };

  const updateAudio = async (partial: Partial<AudioSettings>) => {
    const next: AudioSettings = {
      ...currentAudio,
      ...partial,
    };
    const updated = await updateAppSettings({ audioSettings: next });
    onUpdateSettings(updated);
  };

  return (
    <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-6 shadow-2xs">
      {/* Title Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Radio className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
            Podcast & Audio Speech Engine
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Configure natural, high-fidelity neural speech generation for chapter podcasts and read-aloud
          </p>
        </div>
      </div>

      {/* 1. Speech Engine Selector */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 block">
          Speech Synthesis Engine
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Local WASM Engine */}
          <button
            type="button"
            onClick={() => updateAudio({ engine: 'local-wasm', guideVoice: 'af_heart', analystVoice: 'am_adam' })}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative focus-visible:ring-2 focus-visible:ring-amber-500 ${
              currentAudio.engine === 'local-wasm'
                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-amber-500/50'
                : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-900'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Local Neural WASM
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                Default · Offline
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Kokoro-82M model running 100% locally in your browser. Downloaded once (~80MB), works completely offline with zero API calls.
            </p>
          </button>

          {/* Gemini Studio Cloud Engine */}
          <button
            type="button"
            onClick={() => updateAudio({ engine: 'gemini-cloud', guideVoice: 'Aoede', analystVoice: 'Fenrir' })}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative focus-visible:ring-2 focus-visible:ring-amber-500 ${
              currentAudio.engine === 'gemini-cloud'
                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-amber-500/50'
                : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-900'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Gemini Studio TTS
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                gemini-3.8-flash-tts
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Google&apos;s studio text-to-speech models with lifelike creative acting, dynamic inflection, and expressive dialogue.
            </p>
          </button>

          {/* System Web Speech Fallback */}
          <button
            type="button"
            onClick={() => updateAudio({ engine: 'system' })}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative focus-visible:ring-2 focus-visible:ring-amber-500 ${
              currentAudio.engine === 'system'
                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-amber-500/50'
                : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-900'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  System Voices
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                Fallback
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Standard operating system synthetic voices via the browser Web Speech API. Zero download, lightweight baseline.
            </p>
          </button>
        </div>
      </div>

      {/* Local Kokoro Model Manager */}
      {currentAudio.engine === 'local-wasm' && (
        <KokoroModelManager currentAudio={currentAudio} onUpdateAudio={updateAudio} />
      )}

      {/* 2. Voice Customization: Host A and Host B */}
      <HostVoiceSelector currentAudio={currentAudio} onUpdateAudio={updateAudio} />

      {/* 3. Gemini TTS Model Selector (when in cloud mode) */}
      {currentAudio.engine === 'gemini-cloud' && (
        <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/80 dark:border-blue-900/40 text-xs space-y-2">
          <div className="font-semibold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Gemini Text-to-Speech Model</span>
          </div>
          <div className="flex gap-2">
            {[
              { id: 'gemini-3.8-flash-tts', label: 'gemini-3.8-flash-tts (Creative Studio Quality)' },
              { id: 'gemini-3.8-flash-lite-tts', label: 'gemini-3.8-flash-lite-tts (Fast & Lightweight)' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => updateAudio({ geminiTtsModel: m.id as 'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts' })}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  (currentAudio.geminiTtsModel || 'gemini-3.8-flash-tts') === m.id
                    ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
