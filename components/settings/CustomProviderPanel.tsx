'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Trash2, ShieldCheck, Loader2, RefreshCw, Plus, Star, Shield } from 'lucide-react';
import { PRESETS } from './settingsPresets';
import type { AiProviderApi } from '@/hooks/settings/useAiProviderSettings';

/** Custom OpenAI-compatible provider: presets, endpoint, key, model list and connection test. */
export function CustomProviderPanel({ ai }: { ai: AiProviderApi }) {
  const { providerKind, baseURL, setBaseURL, apiKey, setApiKey, customDefaultModel, customFallbackModel, customModels, newCustomModelInput, setNewCustomModelInput, isTesting, testResult, handleAddCustomModel, handleSetCustomDefault, handleSetCustomFallback, handleRemoveCustomModel, handleTestConnection, handleApplyPreset, saveCustomConfig } = ai;
  return (
    <>
        {/* --- CUSTOM PROVIDER CONFIGURATION --- */}
        {providerKind === 'custom' && (
          <div className="p-5 bg-stone-50 dark:bg-stone-950/60 rounded-xl border border-stone-200 dark:border-stone-800 space-y-5 animate-in fade-in">
            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 block">
                Quick Fill Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Base URL */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Base URL
              </label>
              <input
                type="text"
                value={baseURL}
                onChange={e => {
                  setBaseURL(e.target.value);
                  saveCustomConfig(customDefaultModel, customFallbackModel, customModels, e.target.value, apiKey);
                }}
                placeholder="https://openrouter.ai/api/v1"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-stone-800 dark:text-stone-200"
              />
            </div>

            {/* API Key */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => {
                  setApiKey(e.target.value);
                  saveCustomConfig(customDefaultModel, customFallbackModel, customModels, baseURL, e.target.value);
                }}
                placeholder="sk-..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-stone-800 dark:text-stone-200"
              />
            </div>

            {/* Custom Provider Model Pickers (Primary & Fallback) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Default Primary Model
                </label>
                <select
                  aria-label="Default model"
                  value={customDefaultModel}
                  onChange={e => handleSetCustomDefault(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-stone-800 dark:text-stone-200 cursor-pointer"
                >
                  {customModels.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-stone-600 dark:text-stone-400">Primary model used for chapter requests.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  Fallback (Callback) Model
                </label>
                <select
                  aria-label="Fallback model"
                  value={customFallbackModel}
                  onChange={e => handleSetCustomFallback(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-stone-800 dark:text-stone-200 cursor-pointer"
                >
                  <option value="">None (No Fallback)</option>
                  {customModels.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-stone-600 dark:text-stone-400">Triggered if primary model returns 503, 429, or 500.</p>
              </div>
            </div>

            {/* Custom Multi-Model List in Single Provider */}
            <div className="space-y-2.5 pt-1">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 flex items-center justify-between">
                <span>Models in this Provider ({customModels.length})</span>
                <span className="text-xs text-stone-600 dark:text-stone-400">Manage multiple models under single endpoint</span>
              </label>

              <div className="space-y-2">
                {customModels.map(m => {
                  const isDefault = m === customDefaultModel;
                  const isFallback = m === customFallbackModel;

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
                            onClick={() => handleSetCustomDefault(m)}
                            className="px-2 py-1 text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg transition-colors cursor-pointer"
                            title="Set as Default Model"
                          >
                            Set Default
                          </button>
                        )}
                        {!isFallback && (
                          <button
                            type="button"
                            onClick={() => handleSetCustomFallback(m)}
                            className="px-2 py-1 text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg transition-colors cursor-pointer"
                            title="Set as Fallback Model"
                          >
                            Set Fallback
                          </button>
                        )}
                        {customModels.length > 1 && !isDefault && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomModel(m)}
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

              {/* Add New Custom Model Input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newCustomModelInput}
                  onChange={e => setNewCustomModelInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomModel();
                    }
                  }}
                  placeholder="Add model name (e.g. deepseek-chat or mistral-large)"
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-stone-800 dark:text-stone-200"
                />
                <button
                  type="button"
                  onClick={handleAddCustomModel}
                  disabled={!newCustomModelInput.trim()}
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
                disabled={isTesting || !baseURL || !customDefaultModel}
                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Test Primary & Fallback Models</span>
                  </>
                )}
              </button>
            </div>

            {/* Test Connection Result Alert */}
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

            <p className="text-xs text-stone-600 dark:text-stone-400 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                Your custom key is held in your browser and used per-request. It is never stored on our servers.
              </span>
            </p>
          </div>
        )}
    </>
  );
}
