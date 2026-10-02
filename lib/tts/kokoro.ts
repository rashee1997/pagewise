/**
 * In-browser Local Neural Text-to-Speech using Kokoro-82M ONNX WebAssembly.
 * Runs 100% locally in the browser with high-fidelity, natural human prosody.
 * Quantized model weights (~80MB) are downloaded on first use and cached permanently in browser storage.
 */

import { KokoroTTS } from 'kokoro-js';

export interface KokoroVoiceOption {
  id: string;
  name: string;
  gender: 'female' | 'male';
  accent: 'American' | 'British';
  description: string;
}

export const KOKORO_VOICES: KokoroVoiceOption[] = [
  // American Female
  { id: 'af_heart', name: 'Heart', gender: 'female', accent: 'American', description: 'Warm, natural, expressive tone (Recommended Guide)' },
  { id: 'af_alloy', name: 'Alloy', gender: 'female', accent: 'American', description: 'Balanced and clear tone' },
  { id: 'af_aoede', name: 'Aoede', gender: 'female', accent: 'American', description: 'Melodic, expressive narrative tone' },
  { id: 'af_bella', name: 'Bella', gender: 'female', accent: 'American', description: 'Vibrant, engaging narrative pacing' },
  { id: 'af_jessica', name: 'Jessica', gender: 'female', accent: 'American', description: 'Warm and friendly cadence' },
  { id: 'af_kore', name: 'Kore', gender: 'female', accent: 'American', description: 'Calm, steady, and meditative' },
  { id: 'af_nicole', name: 'Nicole', gender: 'female', accent: 'American', description: 'Crisp, articulate broadcast tone' },
  { id: 'af_nova', name: 'Nova', gender: 'female', accent: 'American', description: 'Bright and energetic' },
  { id: 'af_river', name: 'River', gender: 'female', accent: 'American', description: 'Smooth and soothing' },
  { id: 'af_sarah', name: 'Sarah', gender: 'female', accent: 'American', description: 'Calm, measured, and gentle' },
  { id: 'af_sky', name: 'Sky', gender: 'female', accent: 'American', description: 'Bright, youthful, and friendly' },

  // British Female
  { id: 'bf_emma', name: 'Emma', gender: 'female', accent: 'British', description: 'Refined BBC-style journalistic voice' },
  { id: 'bf_isabella', name: 'Isabella', gender: 'female', accent: 'British', description: 'Intellectual, clear cadence' },
  { id: 'bf_alice', name: 'Alice', gender: 'female', accent: 'British', description: 'Warm British storytelling voice' },
  { id: 'bf_lily', name: 'Lily', gender: 'female', accent: 'British', description: 'Clear and gentle British accent' },

  // American Male
  { id: 'am_adam', name: 'Adam', gender: 'male', accent: 'American', description: 'Conversational broadcaster (Recommended Analyst)' },
  { id: 'am_echo', name: 'Echo', gender: 'male', accent: 'American', description: 'Smooth, resonant, and balanced' },
  { id: 'am_eric', name: 'Eric', gender: 'male', accent: 'American', description: 'Dynamic and conversational' },
  { id: 'am_fenrir', name: 'Fenrir', gender: 'male', accent: 'American', description: 'Deep, steady, and grounded' },
  { id: 'am_liam', name: 'Liam', gender: 'male', accent: 'American', description: 'Clear and professional' },
  { id: 'am_michael', name: 'Michael', gender: 'male', accent: 'American', description: 'Authoritative and insightful baritone' },
  { id: 'am_onyx', name: 'Onyx', gender: 'male', accent: 'American', description: 'Deep and resonant' },
  { id: 'am_puck', name: 'Puck', gender: 'male', accent: 'American', description: 'Energetic and lively' },
  { id: 'am_santa', name: 'Santa', gender: 'male', accent: 'American', description: 'Warm and booming voice' },

  // British Male
  { id: 'bm_george', name: 'George', gender: 'male', accent: 'British', description: 'Thoughtful, analytical cadence' },
  { id: 'bm_lewis', name: 'Lewis', gender: 'male', accent: 'British', description: 'Warm, engaging documentary tone' },
  { id: 'bm_daniel', name: 'Daniel', gender: 'male', accent: 'British', description: 'Authoritative British narrator' },
  { id: 'bm_fable', name: 'Fable', gender: 'male', accent: 'British', description: 'Expressive storytelling voice' },
];

/**
 * Validates and maps voice IDs between engine types (e.g. converting Gemini "Aoede" to Kokoro "af_aoede" or fallback).
 */
export function getCompatibleVoiceId(engine: string, voiceId?: string, isGuide: boolean = true): string {
  if (engine === 'local-wasm') {
    const validKokoro = KOKORO_VOICES.map(v => v.id);
    if (voiceId && validKokoro.includes(voiceId)) {
      return voiceId;
    }
    if (voiceId) {
      const lower = voiceId.toLowerCase();
      if (lower.includes('aoede')) return 'af_aoede';
      if (lower.includes('kore')) return 'af_kore';
      if (lower.includes('fenrir')) return 'am_fenrir';
      if (lower.includes('puck')) return 'am_puck';
      if (lower.includes('zephyr')) return 'af_sky';
      if (lower.includes('charon')) return 'am_michael';
    }
    return isGuide ? 'af_heart' : 'am_adam';
  } else if (engine === 'gemini-cloud') {
    const validGemini = ['Aoede', 'Zephyr', 'Kore', 'Fenrir', 'Charon', 'Puck'];
    if (voiceId && validGemini.includes(voiceId)) {
      return voiceId;
    }
    if (voiceId) {
      const lower = voiceId.toLowerCase();
      if (lower.includes('aoede') || lower.includes('heart')) return 'Aoede';
      if (lower.includes('kore')) return 'Kore';
      if (lower.includes('fenrir') || lower.includes('adam')) return 'Fenrir';
      if (lower.includes('puck')) return 'Puck';
    }
    return isGuide ? 'Aoede' : 'Fenrir';
  }
  return voiceId || (isGuide ? 'af_heart' : 'am_adam');
}

export interface KokoroLoadProgress {
  status: 'idle' | 'downloading' | 'loading' | 'ready' | 'error';
  progress: number; // 0 to 100
  file?: string;
  loadedBytes?: number;
  totalBytes?: number;
  message?: string;
}

type ProgressListener = (p: KokoroLoadProgress) => void;

let ttsInstance: any = null;
let ttsLoadingPromise: Promise<any> | null = null;
const progressListeners = new Set<ProgressListener>();

function notifyProgress(update: KokoroLoadProgress) {
  progressListeners.forEach(l => l(update));
}

export function subscribeKokoroProgress(listener: ProgressListener) {
  progressListeners.add(listener);
  return () => {
    progressListeners.delete(listener);
  };
}

/** Check if the Kokoro model is loaded in memory */
export function isKokoroLoaded(): boolean {
  return ttsInstance !== null;
}

/**
 * Initializes and downloads the Kokoro-82M WASM model.
 * If already loaded, returns immediately.
 */
export async function getKokoroTTS(onProgress?: ProgressListener): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Kokoro TTS can only run in a browser environment.');
  }

  if (ttsInstance) {
    if (onProgress) onProgress({ status: 'ready', progress: 100, message: 'Local neural voice engine ready' });
    return ttsInstance;
  }

  if (onProgress) {
    progressListeners.add(onProgress);
  }

  if (ttsLoadingPromise) {
    return ttsLoadingPromise;
  }

  ttsLoadingPromise = (async () => {
    try {
      notifyProgress({ status: 'downloading', progress: 5, message: 'Initializing local neural WebAssembly voice engine...' });

      const modelId = 'onnx-community/Kokoro-82M-ONNX';
      const instance = await KokoroTTS.from_pretrained(modelId, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (info: any) => {
          if (!info) return;
          if (info.status === 'progress' && typeof info.progress === 'number') {
            const pct = Math.min(99, Math.round(info.progress));
            notifyProgress({
              status: 'downloading',
              progress: pct,
              file: info.file,
              loadedBytes: info.loaded,
              totalBytes: info.total,
              message: `Downloading ${info.file || 'model weights'} (${pct}%)...`,
            });
          } else if (info.status === 'done') {
            notifyProgress({
              status: 'loading',
              progress: 98,
              message: 'Compiling WebAssembly audio synthesis pipeline...',
            });
          }
        },
      });

      ttsInstance = instance;
      notifyProgress({ status: 'ready', progress: 100, message: 'Local neural voice engine ready' });
      return ttsInstance;
    } catch (err: any) {
      console.error('Failed to load local Kokoro TTS model:', err);
      notifyProgress({
        status: 'error',
        progress: 0,
        message: err?.message || 'Failed to download or initialize local voice model.',
      });
      ttsLoadingPromise = null;
      throw err;
    } finally {
      if (onProgress) {
        progressListeners.delete(onProgress);
      }
    }
  })();

  return ttsLoadingPromise;
}

/**
 * Synthesize text into speech using local Kokoro WASM.
 * Returns an audio Blob (WAV format) and an object URL.
 */
export async function synthesizeKokoroSpeech(
  text: string,
  voiceId: string = 'af_heart',
  onProgress?: ProgressListener
): Promise<{ blob: Blob; url: string }> {
  const tts = await getKokoroTTS(onProgress);
  const audio = await tts.generate(text, {
    voice: voiceId,
  });

  const blob: Blob = audio.toBlob();
  const url = URL.createObjectURL(blob);
  return { blob, url };
}

/** Resets and deletes the downloaded local model cache and in-memory instance. */
export async function resetKokoroTTS(): Promise<void> {
  ttsInstance = null;
  ttsLoadingPromise = null;
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await caches.keys();
      for (const name of keys) {
        if (
          name.includes('transformers') ||
          name.includes('onnx') ||
          name.includes('kokoro') ||
          name.includes('huggingface')
        ) {
          await caches.delete(name);
        }
      }
    } catch (e) {
      console.warn('Failed to clear browser cache for Kokoro model:', e);
    }
  }
}

