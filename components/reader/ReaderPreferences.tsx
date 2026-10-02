'use client';

import React, { useEffect } from 'react';
import { Type, AlignLeft, Palette, X } from 'lucide-react';
import { AppSettings } from '@/lib/db/types';

interface ReaderPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
}

export function ReaderPreferences({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: ReaderPreferencesProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="group"
      aria-label="Reading appearance"
      onClick={e => e.stopPropagation()}
      className="absolute top-14 right-4 z-40 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-4 space-y-4 animate-in fade-in zoom-in-95 duration-100 text-xs"
    >
      <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
        <span className="font-semibold text-stone-900 dark:text-stone-100">
          Reading Appearance
        </span>
        <button
          onClick={onClose}
          aria-label="Close reading appearance"
          className="text-stone-600 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Font Family */}
      <div className="space-y-1.5">
        <p className="text-stone-600 dark:text-stone-400 font-medium">Font Family</p>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
          <button
            aria-pressed={settings.readerFontFamily === 'serif'}
            onClick={() => onUpdateSettings({ readerFontFamily: 'serif' })}
            className={`py-1.5 px-3 rounded-lg font-serif text-sm transition-all ${
              settings.readerFontFamily === 'serif'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            Serif (Classic)
          </button>
          <button
            aria-pressed={settings.readerFontFamily === 'sans'}
            onClick={() => onUpdateSettings({ readerFontFamily: 'sans' })}
            className={`py-1.5 px-3 rounded-lg font-sans text-xs transition-all ${
              settings.readerFontFamily === 'sans'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            Sans (Modern)
          </button>
        </div>
      </div>

      {/* Font Size */}
      <div className="space-y-1.5">
        <p className="text-stone-600 dark:text-stone-400 font-medium">Font Size</p>
        <div className="grid grid-cols-4 gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl text-center">
          {(['sm', 'md', 'lg', 'xl'] as const).map(size => (
            <button
              key={size}
              aria-pressed={settings.readerFontSize === size}
              onClick={() => onUpdateSettings({ readerFontSize: size })}
              className={`py-1 rounded-lg font-medium transition-all ${
                settings.readerFontSize === size
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              {size.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Line Width */}
      <div className="space-y-1.5">
        <p className="text-stone-600 dark:text-stone-400 font-medium">Line Width</p>
        <div className="grid grid-cols-3 gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl text-center">
          {(['narrow', 'normal', 'wide'] as const).map(width => (
            <button
              key={width}
              aria-pressed={settings.readerLineWidth === width}
              onClick={() => onUpdateSettings({ readerLineWidth: width })}
              className={`py-1 rounded-lg capitalize font-medium transition-all ${
                settings.readerLineWidth === width
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              {width}
            </button>
          ))}
        </div>
      </div>

      {/* Paper Theme */}
      <div className="space-y-1.5">
        <p className="text-stone-600 dark:text-stone-400 font-medium">Paper Tone</p>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            aria-pressed={settings.readerTheme === 'paper'}
            onClick={() => onUpdateSettings({ readerTheme: 'paper' })}
            title="Warm Paper"
            className={`h-8 rounded-lg border flex items-center justify-center text-xs font-medium bg-[#fbf9f5] text-stone-900 ${
              settings.readerTheme === 'paper' ? 'border-stone-900 ring-2 ring-stone-400' : 'border-stone-200'
            }`}
          >
            Paper
          </button>
          <button
            aria-pressed={settings.readerTheme === 'clean'}
            onClick={() => onUpdateSettings({ readerTheme: 'clean' })}
            title="Clean White"
            className={`h-8 rounded-lg border flex items-center justify-center text-xs font-medium bg-white text-stone-900 ${
              settings.readerTheme === 'clean' ? 'border-stone-900 ring-2 ring-stone-400' : 'border-stone-200'
            }`}
          >
            White
          </button>
          <button
            aria-pressed={settings.readerTheme === 'sepia'}
            onClick={() => onUpdateSettings({ readerTheme: 'sepia' })}
            title="Sepia Vintage"
            className={`h-8 rounded-lg border flex items-center justify-center text-xs font-medium bg-[#f4ecd8] text-[#5b4636] ${
              settings.readerTheme === 'sepia' ? 'border-stone-900 ring-2 ring-stone-400' : 'border-stone-200'
            }`}
          >
            Sepia
          </button>
          <button
            aria-pressed={settings.readerTheme === 'dark'}
            onClick={() => onUpdateSettings({ readerTheme: 'dark' })}
            title="Obsidian Dark"
            className={`h-8 rounded-lg border flex items-center justify-center text-xs font-medium bg-stone-950 text-stone-200 ${
              settings.readerTheme === 'dark' ? 'border-stone-100 ring-2 ring-stone-600' : 'border-stone-800'
            }`}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Voice & Audio Engine */}
      <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <p className="text-stone-600 dark:text-stone-400 font-medium">Read Aloud Engine</p>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
            {settings.audioSettings?.engine === 'local-wasm' ? 'Local Neural (WASM)' : settings.audioSettings?.engine === 'gemini-cloud' ? 'Gemini Studio' : 'System'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl text-[11px]">
          <button
            onClick={() => onUpdateSettings({ audioSettings: { ...(settings.audioSettings || { guideVoice: 'af_heart', analystVoice: 'am_adam', playbackRate: 1.0 }), engine: 'local-wasm' } })}
            className={`py-1 px-1.5 rounded-lg text-center font-medium transition-all cursor-pointer ${
              (settings.audioSettings?.engine || 'local-wasm') === 'local-wasm'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Local WASM
          </button>
          <button
            onClick={() => onUpdateSettings({ audioSettings: { ...(settings.audioSettings || { guideVoice: 'af_heart', analystVoice: 'am_adam', playbackRate: 1.0 }), engine: 'gemini-cloud' } })}
            className={`py-1 px-1.5 rounded-lg text-center font-medium transition-all cursor-pointer ${
              settings.audioSettings?.engine === 'gemini-cloud'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Gemini TTS
          </button>
          <button
            onClick={() => onUpdateSettings({ audioSettings: { ...(settings.audioSettings || { guideVoice: 'af_heart', analystVoice: 'am_adam', playbackRate: 1.0 }), engine: 'system' } })}
            className={`py-1 px-1.5 rounded-lg text-center font-medium transition-all cursor-pointer ${
              settings.audioSettings?.engine === 'system'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            System
          </button>
        </div>
      </div>
    </div>
  );
}
