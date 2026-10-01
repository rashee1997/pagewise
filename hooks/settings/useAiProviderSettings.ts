import { useState } from 'react';
import { AppSettings, ProviderConfig } from '@/lib/db/types';
import { updateAppSettings } from '@/lib/db';
import { PRESETS, DEFAULT_GEMINI_MODELS } from '@/components/settings/settingsPresets';

/** State and handlers for the AI provider settings (Gemini default vs custom OpenAI-compatible endpoint). */
export function useAiProviderSettings(
  settings: AppSettings,
  onUpdateSettings: (s: AppSettings) => void
) {
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

  return {
    providerKind, geminiDefaultModel, geminiFallbackModel, geminiModels, newGeminiModelInput, setNewGeminiModelInput,
    baseURL, setBaseURL, apiKey, setApiKey, customDefaultModel, customFallbackModel, customModels,
    newCustomModelInput, setNewCustomModelInput, isTesting, testResult, setTestResult,
    handleSelectProviderKind, handleAddGeminiModel, handleSetGeminiDefault, handleSetGeminiFallback,
    handleRemoveGeminiModel, handleAddCustomModel, handleSetCustomDefault, handleSetCustomFallback,
    handleRemoveCustomModel, handleTestConnection, handleApplyPreset, saveCustomConfig, saveGeminiConfig,
    setCustomDefaultModel, setCustomFallbackModel, setCustomModels,
  };
}

export type AiProviderApi = ReturnType<typeof useAiProviderSettings>;
