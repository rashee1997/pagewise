'use client';

import React, { useState, useEffect } from 'react';
import { AppSettings, AudioSettings } from '@/lib/db/types';
import { updateAppSettings } from '@/lib/db';
import {
  Volume2,
  Cpu,
  Cloud,
  Sparkles,
  Play,
  Pause,
  Download,
  CheckCircle2,
  Loader2,
  Radio,
  Trash2,
  Sliders,
} from 'lucide-react';
import {
  KOKORO_VOICES,
  getKokoroTTS,
  isKokoroLoaded,
  synthesizeKokoroSpeech,
  resetKokoroTTS,
  KokoroLoadProgress,
} from '@/lib/tts/kokoro';

interface AudioSettingsSectionProps {
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

const GEMINI_VOICES = [
  { id: 'Aoede', name: 'Aoede', gender: 'female', desc: 'Warm, natural, and expressive' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'female', desc: 'Bright, articulate, and clear' },
  { id: 'Kore', name: 'Kore', gender: 'female', desc: 'Calm, steady, and meditative' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male', desc: 'Authoritative, resonant baritone' },
  { id: 'Charon', name: 'Charon', gender: 'male', desc: 'Deep, measured, and reflective' },
  { id: 'Puck', name: 'Puck', gender: 'male', desc: 'Energetic, engaging, and dynamic' },
];

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

  const [downloadProgress, setDownloadProgress] = useState<KokoroLoadProgress | null>(null);
  const [isPreDownloading, setIsPreDownloading] = useState(false);
  const [isDeletingModel, setIsDeletingModel] = useState(false);
  const [isModelReady, setIsModelReady] = useState(() =>
    typeof window !== 'undefined' ? isKokoroLoaded() : false
  );
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  // Stop active preview audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
      }
    };
  }, [previewAudio]);

  const updateAudio = async (partial: Partial<AudioSettings>) => {
    const next: AudioSettings = {
      ...currentAudio,
      ...partial,
    };
    const updated = await updateAppSettings({ audioSettings: next });
    onUpdateSettings(updated);
  };

  const handlePreDownload = async () => {
    setIsPreDownloading(true);
    try {
      await getKokoroTTS(p => {
        setDownloadProgress(p);
      });
      setIsModelReady(true);
    } catch (e) {
      console.error('Failed to pre-download model:', e);
    } finally {
      setIsPreDownloading(false);
    }
  };

  const handleDeleteModel = async () => {
    setIsDeletingModel(true);
    try {
      await resetKokoroTTS();
      setIsModelReady(false);
      setDownloadProgress(null);
    } catch (e) {
      console.error('Failed to delete downloaded model cache:', e);
    } finally {
      setIsDeletingModel(false);
    }
  };

  const handlePreviewVoice = async (voiceId: string, speakerName: string) => {
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
    }

    if (previewingVoice === voiceId) {
      setPreviewingVoice(null);
      return;
    }

    setPreviewingVoice(voiceId);
    const sampleText = `Hello, I'm ${speakerName}. Welcome to the Pagewise chapter deep dive.`;

    try {
      if (currentAudio.engine === 'local-wasm') {
        const { url } = await synthesizeKokoroSpeech(sampleText, voiceId, p => {
          if (!isModelReady) setDownloadProgress(p);
        });
        setIsModelReady(true);
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
        // System Web Speech
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
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
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
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                Default · Offline
              </span>
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
              Kokoro-82M model running 100% locally in your browser. Downloaded once (~80MB), works completely offline with zero API calls.
            </p>
          </button>

          {/* Gemini Studio Cloud Engine */}
          <button
            type="button"
            onClick={() => updateAudio({ engine: 'gemini-cloud', guideVoice: 'Aoede', analystVoice: 'Fenrir' })}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
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
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                gemini-3.8-flash-tts
              </span>
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
              Google&apos;s latest studio text-to-speech models with lifelike creative acting, dynamic inflection, and expressive dialogue.
            </p>
          </button>

          {/* System Web Speech Fallback */}
          <button
            type="button"
            onClick={() => updateAudio({ engine: 'system' })}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
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
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                Fallback
              </span>
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
              Standard operating system synthetic voices via the browser Web Speech API. Zero download, lightweight baseline.
            </p>
          </button>
        </div>
      </div>

      {/* Local Model Storage & One-Time Download Card (Only visible when Local WASM is active) */}
      {currentAudio.engine === 'local-wasm' && (
        <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Local Kokoro-82M WASM Weights & Cache
                </span>
                {isModelReady ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ready & Cached</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                    Not downloaded yet (~80MB)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Weights are securely cached in browser storage. You can delete the downloaded model to free up space anytime.
              </p>

              {downloadProgress && downloadProgress.status === 'downloading' && (
                <div className="space-y-1 pt-1.5">
                  <div className="flex justify-between text-[10px] text-stone-600 dark:text-stone-400 font-semibold">
                    <span>{downloadProgress.message || 'Downloading weights...'}</span>
                    <span>{downloadProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-600 dark:bg-amber-400 h-full transition-all duration-200"
                      style={{ width: `${downloadProgress.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isModelReady ? (
                <button
                  onClick={handlePreDownload}
                  disabled={isPreDownloading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {isPreDownloading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Model Now</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleDeleteModel}
                  disabled={isDeletingModel}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/50 dark:hover:bg-red-900/60 dark:text-red-300 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-900/50 transition-all cursor-pointer disabled:opacity-60"
                  title="Delete downloaded model weights from browser storage"
                >
                  {isDeletingModel ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Downloaded Model</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Custom Kokoro Model & Custom Voice Inputs */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-stone-100">
              <Sliders className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Custom Model & Voice ID Settings</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 block" htmlFor="custom-kokoro-model-id">
                  Custom ONNX Model Repository ID
                </label>
                <input
                  id="custom-kokoro-model-id"
                  type="text"
                  value={currentAudio.customKokoroModelId || 'onnx-community/Kokoro-82M-ONNX'}
                  onChange={e => updateAudio({ customKokoroModelId: e.target.value })}
                  placeholder="e.g. onnx-community/Kokoro-82M-ONNX"
                  className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 block" htmlFor="custom-voice-id">
                  Custom Voice Identifier (Optional)
                </label>
                <input
                  id="custom-voice-id"
                  type="text"
                  value={currentAudio.customVoiceId || ''}
                  onChange={e => updateAudio({ customVoiceId: e.target.value })}
                  placeholder="e.g. af_heart or custom_voice"
                  className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Voice Customization: Host A (Alex) and Host B (Morgan) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Host A (The Guide) */}
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                Host A: Alex (The Guide)
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                Frames concepts, context, and core questions
              </span>
            </div>
            <button
              onClick={() => handlePreviewVoice(currentAudio.customVoiceId || currentAudio.guideVoice, 'Alex')}
              aria-label="Preview Alex voice"
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              {previewingVoice === (currentAudio.customVoiceId || currentAudio.guideVoice) ? (
                <Pause className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              ) : (
                <Play className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              )}
              <span className="text-[11px]">Preview</span>
            </button>
          </div>

          <label className="sr-only" htmlFor="guide-voice-select">
            Alex Voice
          </label>
          <select
            id="guide-voice-select"
            value={currentAudio.guideVoice}
            onChange={e => updateAudio({ guideVoice: e.target.value })}
            className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-medium text-stone-900 dark:text-stone-100 cursor-pointer"
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
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                Nuance, analogies, and practical critique
              </span>
            </div>
            <button
              onClick={() => handlePreviewVoice(currentAudio.analystVoice, 'Morgan')}
              aria-label="Preview Morgan voice"
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              {previewingVoice === currentAudio.analystVoice ? (
                <Pause className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              ) : (
                <Play className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              )}
              <span className="text-[11px]">Preview</span>
            </button>
          </div>

          <label className="sr-only" htmlFor="analyst-voice-select">
            Morgan Voice
          </label>
          <select
            id="analyst-voice-select"
            value={currentAudio.analystVoice}
            onChange={e => updateAudio({ analystVoice: e.target.value })}
            className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-medium text-stone-900 dark:text-stone-100 cursor-pointer"
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
                onClick={() => updateAudio({ geminiTtsModel: m.id as any })}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
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
