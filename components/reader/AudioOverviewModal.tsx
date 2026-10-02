'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Book, Chapter, AppSettings, AudioOverviewData, TtsEngine } from '@/lib/db/types';
import { getChapterMaterial, saveChapterMaterial, saveGenerationRecord } from '@/lib/db';
import { KokoroLoadProgress } from '@/lib/tts/kokoro';
import { useAudioOverviewPlayer } from '@/hooks/reader/useAudioOverviewPlayer';
import { AudioEngineHeader } from './audio/AudioEngineHeader';
import { AudioOverviewTranscript } from './audio/AudioOverviewTranscript';
import { AudioOverviewControls } from './audio/AudioOverviewControls';

export interface AudioOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  chapter: Chapter;
  settings: AppSettings;
}

export function AudioOverviewModal({
  isOpen,
  onClose,
  book,
  chapter,
  settings,
}: AudioOverviewModalProps) {
  const [data, setData] = useState<AudioOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<TtsEngine | null>(null);
  const engine: TtsEngine = selectedEngine || settings.audioSettings?.engine || 'local-wasm';
  const [downloadProgress, setDownloadProgress] = useState<KokoroLoadProgress | null>(null);

  const handleSynthesisError = useCallback((err: string) => {
    setError(err);
  }, []);

  const handleDownloadProgress = useCallback((p: KokoroLoadProgress | null) => {
    setDownloadProgress(p);
  }, []);

  const player = useAudioOverviewPlayer({
    data,
    settings,
    engine,
    onSynthesisError: handleSynthesisError,
    onDownloadProgress: handleDownloadProgress,
  });

  // Load from database cache on open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    (async () => {
      try {
        const cached = await getChapterMaterial<AudioOverviewData>(chapter.id, 'audioOverview');
        if (cached && isMounted) {
          setData(cached);
          player.setCurrentTurn(0);
        } else if (isMounted) {
          setData(null);
        }
      } catch (e) {
        console.error('Failed to load cached audio overview:', e);
      }
    })();

    return () => {
      isMounted = false;
      player.stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, chapter.id]);

  const handleGenerate = async () => {
    player.stopAudio();
    setIsLoading(true);
    setError(null);
    player.clearCache();
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'audioOverview',
          chapterText: chapter.text,
          bookTitle: book.title,
          author: book.author,
          chapterTitle: chapter.title,
          provider: settings.provider,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to generate audio overview.');
      }

      if (json.data && Array.isArray(json.data.turns) && json.data.turns.length > 0) {
        const payload: AudioOverviewData = {
          title: json.data.title || `Deep Dive: ${chapter.title}`,
          durationEstimate: json.data.durationEstimate || '4 min',
          turns: json.data.turns,
        };

        setData(payload);
        player.setCurrentTurn(0);

        // Save to database cache and audit record
        await saveChapterMaterial(book.id, chapter.id, 'audioOverview', payload);
        await saveGenerationRecord({
          id: `rec_${chapter.id}_audioOverview_${Date.now()}`,
          bookId: book.id,
          chapterId: chapter.id,
          kind: 'audioOverview',
          inputHash: chapter.textHash || '',
          promptVersion: '1.0',
          batch: 1,
          createdAt: Date.now(),
        });
      } else {
        throw new Error('Unexpected audio overview response format.');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not generate audio overview.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEngine = (nextEngine: TtsEngine) => {
    player.stopAudio();
    setSelectedEngine(nextEngine);
  };

  const handleClose = () => {
    player.stopAudio();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Audio Briefing (Two-Host Podcast)"
      hideTitle
      panelClassName="w-full max-w-2xl max-h-[90dvh] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-900 dark:text-stone-100 animate-in zoom-in-95 duration-200"
    >
      <AudioEngineHeader
        data={data}
        chapter={chapter}
        engine={engine}
        onSelectEngine={handleSelectEngine}
        downloadProgress={downloadProgress}
        onClose={handleClose}
      />

      <AudioOverviewTranscript
        data={data}
        chapter={chapter}
        isLoading={isLoading}
        error={error}
        currentTurn={player.currentTurn}
        isPlaying={player.isPlaying}
        isSynthesizing={player.isSynthesizing}
        onPlayTurn={player.playTurn}
        onGenerate={handleGenerate}
      />

      {!isLoading && data && (
        <AudioOverviewControls
          data={data}
          currentTurn={player.currentTurn}
          rate={player.rate}
          onRateChange={player.updateRate}
          isPlaying={player.isPlaying}
          isSynthesizing={player.isSynthesizing}
          onTogglePlay={player.togglePlay}
          onSkipBack={player.skipBack}
          onSkipForward={player.skipForward}
        />
      )}
    </Dialog>
  );
}
