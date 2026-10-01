'use client';

import React, { useState } from 'react';
import { AppSettings, ProviderConfig } from '@/lib/db/types';
import { updateAppSettings, exportAllData, importAllData, clearAllDatabase } from '@/lib/db';
import {
  Sparkles,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sun,
  Moon,
  Laptop,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Plus,
  Star,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetApp: () => void;
}

const PRESETS = [
  { name: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', defaultModel: 'google/gemini-2.0-flash-001', fallbackModel: 'meta-llama/llama-3.3-70b-instruct' },
  { name: 'OpenAI', baseURL: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', fallbackModel: 'gpt-3.5-turbo' },
  { name: 'Groq', baseURL: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile', fallbackModel: 'llama-3.1-8b-instant' },
  { name: 'Ollama (Local)', baseURL: 'http://localhost:11434/v1', defaultModel: 'llama3.2', fallbackModel: 'mistral' },
  { name: 'LM Studio (Local)', baseURL: 'http://localhost:1234/v1', defaultModel: 'local-model', fallbackModel: '' },
];

const DEFAULT_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.1-pro-preview',
];

export function SettingsView({ settings, onUpdateSettings, onResetApp }: SettingsViewProps) {
  const [providerKind, setProviderKind] = useState<'default' | 'custom'>(settings.provider.kind);

  // Gemini state
  const [geminiDefaultModel, setGeminiDefaultModel] = useState<string>(
    settings.provider.kind === 'default' && settings.provider.model
      ? settings.provider.model
      : 'gemini-3.8-flash'
  );
  const [geminiFallbackModel, setGeminiFallbackModel] = useState<string>(
    settings.provider.kind === 'default' && settings.provider.fallbackModel
      ? settings.provider.fallbackModel
      : 'gemini-3.1-flash-lite'
  );
  const [geminiModels, setGeminiModels] = useState<string[]>(
    settings.provider.kind === 'default' && settings.provider.models?.length
      ? settings.provider.models
      : DEFAULT_GEMINI_MODELS
  );
  const [newGeminiModelInput, setNewGeminiModelInput] = useState('');

  // Custom Provider state
  const [baseURL, setBaseURL] = useState(settings.provider.baseURL || '');
  const [apiKey, setApiKey] = useState(settings.provider.apiKey || '');
  const [customDefaultModel, setCustomDefaultModel] = useState<string>(
    settings.provider.kind === 'custom' && settings.provider.model
      ? settings.provider.model
      : 'gpt-4o-mini'
  );
  const [customFallbackModel, setCustomFallbackModel] = useState<string>(
    settings.provider.kind === 'custom' && settings.provider.fallbackModel
      ? settings.provider.fallbackModel
      : 'llama-3.3-70b-versatile'
  );
  const [customModels, setCustomModels] = useState<string[]>(
    settings.provider.kind === 'custom' && settings.provider.models?.length
      ? settings.provider.models
      : ['gpt-4o-mini', 'llama-3.3-70b-versatile']
  );
  const [newCustomModelInput, setNewCustomModelInput] = useState('');

  // Test connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Backup state
  const [includeKeyInBackup, setIncludeKeyInBackup] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Storage estimation state
  const [storageEstimate, setStorageEstimate] = useState<{ usageMB: number; quotaMB: number; percent: number; isPersisted: boolean } | null>(null);

  React.useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      Promise.all([
        navigator.storage.estimate(),
        navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false),
      ]).then(([estimate, persisted]) => {
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1;
        setStorageEstimate({
          usageMB: Math.round((usage / (1024 * 1024)) * 10) / 10,
          quotaMB: Math.round(quota / (1024 * 1024)),
          percent: Math.min(100, Math.round((usage / quota) * 100)),
          isPersisted: !!persisted,
        });
      });
    }
  }, []);

  const handleRequestPersistence = async () => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      const granted = await navigator.storage.persist();
      if (granted && storageEstimate) {
        setStorageEstimate(prev => (prev ? { ...prev, isPersisted: true } : null));
        alert('Persistent local browser storage is now active! The browser will not clear your books or cards under storage pressure.');
      }
    }
  };

  // Helper to persist Gemini provider updates
  const saveGeminiConfig = async (
    primary = geminiDefaultModel,
    fallback = geminiFallbackModel,
    modelsList = geminiModels
  ) => {
    const newProvider: ProviderConfig = {
      kind: 'default',
      model: primary,
      fallbackModel: fallback,
      models: modelsList,
    };
    const updated = await updateAppSettings({ provider: newProvider });
    onUpdateSettings(updated);
  };

  // Helper to persist Custom provider updates
  const saveCustomConfig = async (
    primary = customDefaultModel,
    fallback = customFallbackModel,
    modelsList = customModels,
    url = baseURL,
    key = apiKey
  ) => {
    const newProvider: ProviderConfig = {
      kind: 'custom',
      baseURL: url.trim(),
      apiKey: key.trim(),
      model: primary.trim(),
      fallbackModel: fallback.trim(),
      models: modelsList,
    };
    const updated = await updateAppSettings({ provider: newProvider });
    onUpdateSettings(updated);
  };

  // Switch between default and custom
  const handleSelectProviderKind = async (newKind: 'default' | 'custom') => {
    setProviderKind(newKind);
    setTestResult(null);
    if (newKind === 'default') {
      await saveGeminiConfig();
    } else {
      await saveCustomConfig();
    }
  };

  // --- Gemini Model Management ---
  const handleAddGeminiModel = async () => {
    const trimmed = newGeminiModelInput.trim();
    if (!trimmed || geminiModels.includes(trimmed)) return;
    const updated = [...geminiModels, trimmed];
    setGeminiModels(updated);
    setNewGeminiModelInput('');
    await saveGeminiConfig(geminiDefaultModel, geminiFallbackModel, updated);
  };

  const handleSetGeminiDefault = async (m: string) => {
    setGeminiDefaultModel(m);
    await saveGeminiConfig(m, geminiFallbackModel, geminiModels);
  };

  const handleSetGeminiFallback = async (m: string) => {
    setGeminiFallbackModel(m);
    await saveGeminiConfig(geminiDefaultModel, m, geminiModels);
  };

  const handleRemoveGeminiModel = async (m: string) => {
    if (geminiModels.length <= 1) return;
    const updated = geminiModels.filter(item => item !== m);
    setGeminiModels(updated);
    const newDef = geminiDefaultModel === m ? updated[0] : geminiDefaultModel;
    const newFb = geminiFallbackModel === m ? (updated[1] || updated[0]) : geminiFallbackModel;
    setGeminiDefaultModel(newDef);
    setGeminiFallbackModel(newFb);
    await saveGeminiConfig(newDef, newFb, updated);
  };

  // --- Custom Model Management ---
  const handleAddCustomModel = async () => {
    const trimmed = newCustomModelInput.trim();
    if (!trimmed || customModels.includes(trimmed)) return;
    const updated = [...customModels, trimmed];
    setCustomModels(updated);
    setNewCustomModelInput('');
    const newFb = !customFallbackModel && updated.length > 1 ? trimmed : customFallbackModel;
    if (!customFallbackModel && updated.length > 1) {
      setCustomFallbackModel(trimmed);
    }
    await saveCustomConfig(customDefaultModel, newFb, updated);
  };

  const handleSetCustomDefault = async (m: string) => {
    setCustomDefaultModel(m);
    await saveCustomConfig(m, customFallbackModel, customModels);
  };

  const handleSetCustomFallback = async (m: string) => {
    setCustomFallbackModel(m);
    await saveCustomConfig(customDefaultModel, m, customModels);
  };

  const handleRemoveCustomModel = async (m: string) => {
    if (customModels.length <= 1) return;
    const updated = customModels.filter(item => item !== m);
    setCustomModels(updated);
    const newDef = customDefaultModel === m ? updated[0] : customDefaultModel;
    const newFb = customFallbackModel === m ? (updated.find(x => x !== newDef) || '') : customFallbackModel;
    setCustomDefaultModel(newDef);
    setCustomFallbackModel(newFb);
    await saveCustomConfig(newDef, newFb, updated);
  };

  // --- Test Connection ---
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const payload =
        providerKind === 'default'
          ? {
              kind: 'default',
              model: geminiDefaultModel,
              fallbackModel: geminiFallbackModel,
            }
          : {
              kind: 'custom',
              baseURL: baseURL.trim(),
              apiKey: apiKey.trim(),
              model: customDefaultModel.trim(),
              fallbackModel: customFallbackModel.trim(),
            };

      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, message: data.message || 'Connection successful!' });
        if (providerKind === 'custom') {
          await saveCustomConfig();
        } else {
          await saveGeminiConfig();
        }
      } else {
        setTestResult({ ok: false, message: data.error || 'Connection test failed.' });
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Network error reaching test endpoint.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setBaseURL(preset.baseURL);
    setCustomDefaultModel(preset.defaultModel);
    setCustomFallbackModel(preset.fallbackModel || '');
    const newModels = Array.from(new Set([preset.defaultModel, ...(preset.fallbackModel ? [preset.fallbackModel] : []), ...customModels]));
    setCustomModels(newModels);
    setTestResult(null);
    saveCustomConfig(preset.defaultModel, preset.fallbackModel || '', newModels, preset.baseURL, apiKey);
  };

  const handleExportBackup = async () => {
    const jsonStr = await exportAllData(includeKeyInBackup);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagewise_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const content = event.target?.result as string;
        const res = await importAllData(content);
        setImportStatus(`Restored ${res.bookCount} books and ${res.cardCount} cards!`);
        setTimeout(() => {
          onResetApp();
        }, 800);
      } catch (err: any) {
        setImportStatus(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to delete all local books, cards, notes, and progress? This cannot be undone.')) {
      await clearAllDatabase();
      onResetApp();
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Settings
        </h1>
        <p className="text-xs md:text-sm text-stone-500">
          AI model fallbacks, multi-model routing, reading goals, themes, and browser data
        </p>
      </div>

      {/* 1. AI Model Section */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-6 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              AI Models & Provider Settings
            </h2>
            <p className="text-xs text-stone-500">
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
            <p className="text-xs text-stone-500 leading-relaxed">
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
            <p className="text-xs text-stone-500 leading-relaxed">
              Connect OpenRouter, OpenAI, Groq, Ollama, or LM Studio with multiple models and custom fallback.
            </p>
          </div>
        </div>

        {/* --- DEFAULT GEMINI CONFIGURATION --- */}
        {providerKind === 'default' && (
          <div className="p-5 bg-stone-50 dark:bg-stone-950/60 rounded-xl border border-stone-200 dark:border-stone-800 space-y-5 animate-in fade-in">
            {/* Automatic Failover Note */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
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
                  value={geminiDefaultModel}
                  onChange={e => handleSetGeminiDefault(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-stone-800 dark:text-stone-200 cursor-pointer"
                >
                  {geminiModels.map(m => (
                    <option key={m} value={m}>
                      {m} {m === 'gemini-3.8-flash' ? '(Balanced — Default)' : m === 'gemini-3.1-flash-lite' ? '(High Speed)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-stone-400">Used for first attempt on all chapter generations.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  Default Fallback (Callback) Model
                </label>
                <select
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
                <p className="text-[11px] text-stone-400">Called automatically if primary model is unavailable.</p>
              </div>
            </div>

            {/* Gemini Models List in Single Provider */}
            <div className="space-y-2.5 pt-1">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 flex items-center justify-between">
                <span>Configured Models in Provider ({geminiModels.length})</span>
                <span className="text-[11px] text-stone-400">Click star or shield to switch primary/fallback</span>
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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-semibold rounded-md shrink-0">
                            <Star className="w-2.5 h-2.5 fill-amber-500" />
                            Primary Default
                          </span>
                        )}
                        {isFallback && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold rounded-md shrink-0">
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
                            className="px-2 py-1 text-[11px] font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg transition-colors cursor-pointer"
                            title="Set as Default Primary Model"
                          >
                            Set Default
                          </button>
                        )}
                        {!isFallback && (
                          <button
                            type="button"
                            onClick={() => handleSetGeminiFallback(m)}
                            className="px-2 py-1 text-[11px] font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg transition-colors cursor-pointer"
                            title="Set as Fallback Model"
                          >
                            Set Fallback
                          </button>
                        )}
                        {geminiModels.length > 1 && !isDefault && !isFallback && (
                          <button
                            type="button"
                            onClick={() => handleRemoveGeminiModel(m)}
                            className="p-1 text-stone-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
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
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        )}

        {/* --- CUSTOM PROVIDER CONFIGURATION --- */}
        {providerKind === 'custom' && (
          <div className="p-5 bg-stone-50 dark:bg-stone-950/60 rounded-xl border border-stone-200 dark:border-stone-800 space-y-5 animate-in fade-in">
            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 block">
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
                <p className="text-[11px] text-stone-400">Primary model used for chapter requests.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  Fallback (Callback) Model
                </label>
                <select
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
                <p className="text-[11px] text-stone-400">Triggered if primary model returns 503, 429, or 500.</p>
              </div>
            </div>

            {/* Custom Multi-Model List in Single Provider */}
            <div className="space-y-2.5 pt-1">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 flex items-center justify-between">
                <span>Models in this Provider ({customModels.length})</span>
                <span className="text-[11px] text-stone-400">Manage multiple models under single endpoint</span>
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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-semibold rounded-md shrink-0">
                            <Star className="w-2.5 h-2.5 fill-amber-500" />
                            Primary Default
                          </span>
                        )}
                        {isFallback && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold rounded-md shrink-0">
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
                            className="px-2 py-1 text-[11px] font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg transition-colors cursor-pointer"
                            title="Set as Default Model"
                          >
                            Set Default
                          </button>
                        )}
                        {!isFallback && (
                          <button
                            type="button"
                            onClick={() => handleSetCustomFallback(m)}
                            className="px-2 py-1 text-[11px] font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg transition-colors cursor-pointer"
                            title="Set as Fallback Model"
                          >
                            Set Fallback
                          </button>
                        )}
                        {customModels.length > 1 && !isDefault && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomModel(m)}
                            className="p-1 text-stone-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
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
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <p className="text-[11px] text-stone-400 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                Your custom key is held in your browser and used per-request. It is never stored on our servers.
              </span>
            </p>
          </div>
        )}
      </section>

      {/* 2. Daily Reading Goals */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Daily Reading Goal
            </h2>
            <p className="text-xs text-stone-500">
              Set your target reading time to build a consistent habit
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {[10, 15, 20, 30, 45, 60].map(mins => (
            <button
              key={mins}
              onClick={async () => {
                const updated = await updateAppSettings({ dailyGoalMinutes: mins });
                onUpdateSettings(updated);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                settings.dailyGoalMinutes === mins
                  ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              {mins} mins / day
            </button>
          ))}
        </div>
      </section>

      {/* 3. Appearance */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              App Appearance
            </h2>
            <p className="text-xs text-stone-500">
              Light, dark, or system matching theme
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['system', 'light', 'dark'] as const).map(themeOption => (
            <button
              key={themeOption}
              onClick={async () => {
                const updated = await updateAppSettings({ theme: themeOption });
                onUpdateSettings(updated);
              }}
              className={`p-3 rounded-xl border text-xs font-semibold capitalize flex items-center justify-center gap-2 transition-all ${
                settings.theme === themeOption
                  ? 'border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-2xs'
                  : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300'
              }`}
            >
              {themeOption === 'light' && <Sun className="w-4 h-4" />}
              {themeOption === 'dark' && <Moon className="w-4 h-4" />}
              {themeOption === 'system' && <Laptop className="w-4 h-4" />}
              <span>{themeOption}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 4. Data Management & Backups */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-6 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Data & Backups
            </h2>
            <p className="text-xs text-stone-500">
              All books, flashcards, and notes reside locally in your browser’s IndexedDB
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export */}
          <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
            <h3 className="text-xs font-semibold text-stone-800 dark:text-stone-200">
              Export Backup
            </h3>
            <p className="text-[11px] text-stone-500">
              Download all books, flashcards, and study progress as a single JSON file.
            </p>

            <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includeKeyInBackup}
                onChange={e => setIncludeKeyInBackup(e.target.checked)}
                className="rounded border-stone-300 text-stone-900"
              />
              <span>Include custom API key</span>
            </label>

            <button
              onClick={handleExportBackup}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 rounded-lg text-xs font-medium hover:bg-stone-100"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON Backup</span>
            </button>
          </div>

          {/* Import */}
          <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
            <h3 className="text-xs font-semibold text-stone-800 dark:text-stone-200">
              Restore from Backup
            </h3>
            <p className="text-[11px] text-stone-500">
              Load previously exported JSON backup file to restore your entire library.
            </p>

            <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 rounded-lg text-xs font-medium hover:bg-stone-100 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Select Backup File</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>

            {importStatus && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                {importStatus}
              </p>
            )}
          </div>
        </div>

        {/* Local Storage Meter & Quota */}
        {storageEstimate && (
          <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-800 dark:text-stone-200">
              <span>IndexedDB Storage Usage</span>
              <span>{storageEstimate.usageMB} MB of {storageEstimate.quotaMB} MB ({storageEstimate.percent}%)</span>
            </div>

            <div className="w-full bg-stone-200 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-stone-900 dark:bg-stone-100 h-full rounded-full transition-all"
                style={{ width: `${Math.max(2, storageEstimate.percent)}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-stone-500">
                {storageEstimate.isPersisted ? '✓ Persistent storage granted' : 'Standard temporary storage'}
              </span>

              {!storageEstimate.isPersisted && (
                <button
                  type="button"
                  onClick={handleRequestPersistence}
                  className="text-[11px] font-semibold text-stone-900 dark:text-stone-100 underline hover:opacity-80 cursor-pointer"
                >
                  Enable Persistent Storage
                </button>
              )}
            </div>
          </div>
        )}

        {/* Clear Data Danger Zone */}
        <div className="pt-4 border-t border-stone-100 dark:border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-semibold text-red-600 dark:text-red-400">
              Clear All Local Data
            </h4>
            <p className="text-[11px] text-stone-400">
              Permanently wipes all books, flashcards, and reading statistics.
            </p>
          </div>

          <button
            onClick={handleClearAll}
            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium border border-red-200 dark:border-red-900 transition-colors shrink-0"
          >
            Clear Database
          </button>
        </div>
      </section>
    </div>
  );
}
