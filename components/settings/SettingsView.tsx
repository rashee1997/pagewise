'use client';

import React from 'react';
import { AppSettings } from '@/lib/db/types';
import { useAiProviderSettings } from '@/hooks/settings/useAiProviderSettings';
import { AiProviderSection } from './AiProviderSection';
import { GoalSection } from './GoalSection';
import { AppearanceSection } from './AppearanceSection';
import { DataSection } from './DataSection';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetApp: () => void;
}

export function SettingsView({ settings, onUpdateSettings, onResetApp }: SettingsViewProps) {
  const ai = useAiProviderSettings(settings, onUpdateSettings);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Settings</h1>
        <p className="text-xs md:text-sm text-stone-600 dark:text-stone-400">
          AI model fallbacks, multi-model routing, reading goals, themes, and browser data
        </p>
      </div>

      <AiProviderSection ai={ai} />
      <GoalSection settings={settings} onUpdateSettings={onUpdateSettings} />
      <AppearanceSection settings={settings} onUpdateSettings={onUpdateSettings} />
      <DataSection onResetApp={onResetApp} />
    </div>
  );
}
