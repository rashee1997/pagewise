'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Trash2, Loader2, RefreshCw, Plus, Star, Shield } from 'lucide-react';
import type { AiProviderApi } from '@/hooks/settings/useAiProviderSettings';

/** Default Gemini configuration: model list, default and fallback selection, connection test. */
export function GeminiPanel({ ai }: { ai: AiProviderApi }) {
  const { providerKind, geminiDefaultModel, geminiFallbackModel, geminiModels, newGeminiModelInput, setNewGeminiModelInput, isTesting, testResult, handleAddGeminiModel, handleSetGeminiDefault, handleSetGeminiFallback, handleRemoveGeminiModel, handleTestConnection } = ai;
  return (
    <>
        {/* --- DEFAULT GEMINI CONFIGURATION --- */}
        {providerKind === 'default' && (
          <div className="p-5 bg-stone-50 dark:bg-stone-950/60 rounded-xl border border-stone-200 dark:border-stone-800 space-y-5 animate-in fade-in">
            {/* Automatic Failover Note */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <Shield className="w-4 h-4 text-amber-800 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">High-Availability Automatic Fallback Enabled</span>
                <span>
                  If the default model experiences a temporary capacity spike (503) or rate limits, Pagewise instantly reroutes the request to your fallback model so study material generation never fails.
                </span>
              </div>
            </div>

            {/* Default & Fallback Summary Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Default Primary Model
                </label>
                <select
                  aria-label="Default model"
                  value={geminiDefaultModel}
                  onChange={e => handleSetGeminiDefault(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-stone-800 dark:text-stone-200 cursor-pointer"
                >
                  {geminiModels.map(m => (
                    <option key={m} value={m}>
                      {m} {m === 'gemini-3.8-flash' ? '(Balanced, Default)' : m === 'gemini-3.1-flash-lite' ? '(High Speed)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-stone-600 dark:text-stone-400">Used for first attempt on all chapter generations.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  Default Fallback (Callback) Model
                </label>
                <select
                  aria-label="Fallback model"
                  value={geminiFallbackModel}
                  onChange={e => handleSetGeminiFallback(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-stone-800 dark:text-stone-200 cursor-pointer"
                >
                  {geminiModels.map(m => (
                    <option key={m} value={m}>
                      {m} {m === 'gemini-3.1-flash-lite' ? '(Recommended Fallback)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-stone-600 dark:text-stone-400">Called automatically if primary model is unavailable.</p>
              </div>
            </div>

            {/* Gemini Models List in Single Provider */}
            <div className="space-y-2.5 pt-1">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 flex items-center justify-between">
                <span>Configured Models in Provider ({geminiModels.length})</span>
                <span className="text-xs text-stone-600 dark:text-stone-400">Click star or shield to switch primary/fallback</span>
              </label>

              <div className="space-y-2">
                {geminiModels.map(m => {
                  const isDefault = m === geminiDefaultModel;
                  const isFallback = m === geminiFallbackModel;

                  return (
                    <div
                      key={m}
                      className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-medium text-stone-900 dark:text-stone-100 truncate">
                          {m}
                        </span>
                        {isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold rounded-md shrink-0">
                            <Star className="w-2.5 h-2.5 fill-amber-500" />
                            Primary Default
                          </span>
                        )}
                        {isFallback && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-md shrink-0">
                            <Shield className="w-2.5 h-2.5" />
                            Fallback
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetGeminiDefault(m)}
                            className="px-2 py-1 text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg transition-colors cursor-pointer"
                            title="Set as Default Primary Model"
                          >
                            Set Default
                          </button>
                        )}
                        {!isFallback && (
                          <button
                            type="button"
                            onClick={() => handleSetGeminiFallback(m)}
                            className="px-2 py-1 text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg transition-colors cursor-pointer"
                            title="Set as Fallback Model"
                          >
                            Set Fallback
                          </button>
                        )}
                        {geminiModels.length > 1 && !isDefault && !isFallback && (
                          <button
                            type="button"
                            onClick={() => handleRemoveGeminiModel(m)}
                            className="p-1 text-stone-600 dark:text-stone-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                            title="Remove Model"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Gemini Model */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newGeminiModelInput}
                  onChange={e => setNewGeminiModelInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddGeminiModel();
                    }
                  }}
                  placeholder="Add model (e.g. gemini-2.5-flash or custom alias)"
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-stone-800 dark:text-stone-200"
                />
                <button
                  type="button"
                  onClick={handleAddGeminiModel}
                  disabled={!newGeminiModelInput.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Model</span>
                </button>
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Gemini Models...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Verify Primary & Fallback Models</span>
                  </>
                )}
              </button>
            </div>

            {/* Test Result Alert */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  testResult.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        )}
    </>
  );
}
