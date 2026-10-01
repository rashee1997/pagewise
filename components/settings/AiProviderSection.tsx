'use client';

import React from 'react';
import { Sparkles, Cpu, CheckCircle2, Layers } from 'lucide-react';
import type { AiProviderApi } from '@/hooks/settings/useAiProviderSettings';
import { GeminiPanel } from './GeminiPanel';
import { CustomProviderPanel } from './CustomProviderPanel';

/** "AI Models & Provider Settings" card: provider choice plus the matching configuration panel. */
export function AiProviderSection({ ai }: { ai: AiProviderApi }) {
  const { providerKind, handleSelectProviderKind } = ai;
  return (
    <>
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-6 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              AI Models & Provider Settings
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Configure default models, automatic fallback routing, and custom provider endpoints
            </p>
          </div>
        </div>

        {/* Provider Radio Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Default Option */}
          <div
            onClick={() => handleSelectProviderKind('default')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              providerKind === 'default'
                ? 'border-stone-900 dark:border-stone-100 bg-stone-50/70 dark:bg-stone-800/40'
                : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Google Gemini (Server-Side)
              </span>
              {providerKind === 'default' && (
                <CheckCircle2 className="w-4 h-4 text-stone-900 dark:text-stone-100" />
              )}
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Included high-speed intelligence. Features automatic fallback to Flash Lite if demand spikes occur.
            </p>
          </div>

          {/* Custom Option */}
          <div
            onClick={() => handleSelectProviderKind('custom')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              providerKind === 'custom'
                ? 'border-stone-900 dark:border-stone-100 bg-stone-50/70 dark:bg-stone-800/40'
                : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                Custom Endpoint (OpenAI API)
              </span>
              {providerKind === 'custom' && (
                <CheckCircle2 className="w-4 h-4 text-stone-900 dark:text-stone-100" />
              )}
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Connect OpenRouter, OpenAI, Groq, Ollama, or LM Studio with multiple models and custom fallback.
            </p>
          </div>
        </div>
        <GeminiPanel ai={ai} />
        <CustomProviderPanel ai={ai} />
      </section>
    </>
  );
}
