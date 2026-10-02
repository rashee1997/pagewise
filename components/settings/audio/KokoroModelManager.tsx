'use client';

import React, { useState } from 'react';
import { AudioSettings } from '@/lib/db/types';
import { CheckCircle2, Download, Loader2, Sliders, Trash2 } from 'lucide-react';
import {
  getKokoroTTS,
  isKokoroLoaded,
  resetKokoroTTS,
  KokoroLoadProgress,
} from '@/lib/tts/kokoro';

interface KokoroModelManagerProps {
  currentAudio: AudioSettings;
  onUpdateAudio: (partial: Partial<AudioSettings>) => Promise<void>;
}

export function KokoroModelManager({ currentAudio, onUpdateAudio }: KokoroModelManagerProps) {
  const [downloadProgress, setDownloadProgress] = useState<KokoroLoadProgress | null>(null);
  const [isPreDownloading, setIsPreDownloading] = useState(false);
  const [isDeletingModel, setIsDeletingModel] = useState(false);
  const [isModelReady, setIsModelReady] = useState(() =>
    typeof window !== 'undefined' ? isKokoroLoaded() : false
  );

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

  return (
    <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
              Local Kokoro-82M WASM Weights & Cache
            </span>
            {isModelReady ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready & Cached</span>
              </span>
            ) : (
              <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                Not downloaded yet (~80MB)
              </span>
            )}
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Weights are securely cached in browser storage. You can delete the downloaded model to free up space anytime.
          </p>

          {downloadProgress && downloadProgress.status === 'downloading' && (
            <div className="space-y-1.5 pt-1.5" role="progressbar" aria-valuenow={downloadProgress.progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="flex justify-between text-xs text-stone-600 dark:text-stone-400 font-semibold">
                <span>{downloadProgress.message || 'Downloading weights...'}</span>
                <span>{downloadProgress.progress}%</span>
              </div>
              <div className="w-full bg-stone-200 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
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
              type="button"
              onClick={handlePreDownload}
              disabled={isPreDownloading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-amber-500"
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
              type="button"
              onClick={handleDeleteModel}
              disabled={isDeletingModel}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/50 dark:hover:bg-red-900/60 dark:text-red-300 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-900/50 transition-all cursor-pointer disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-red-500"
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
            <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block" htmlFor="custom-kokoro-model-id">
              Custom ONNX Model Repository ID
            </label>
            <input
              id="custom-kokoro-model-id"
              type="text"
              value={currentAudio.customKokoroModelId || 'onnx-community/Kokoro-82M-ONNX'}
              onChange={e => onUpdateAudio({ customKokoroModelId: e.target.value })}
              placeholder="e.g. onnx-community/Kokoro-82M-ONNX"
              className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 font-mono focus-visible:ring-2 focus-visible:ring-amber-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block" htmlFor="custom-voice-id">
              Custom Voice Identifier (Optional)
            </label>
            <input
              id="custom-voice-id"
              type="text"
              value={currentAudio.customVoiceId || ''}
              onChange={e => onUpdateAudio({ customVoiceId: e.target.value })}
              placeholder="e.g. af_heart or custom_voice"
              className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 font-mono focus-visible:ring-2 focus-visible:ring-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
