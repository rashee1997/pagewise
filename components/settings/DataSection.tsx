'use client';

import React, { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { exportAllData, importAllData, clearAllDatabase } from '@/lib/db';

interface Props {
  onResetApp: () => void;
}

/** Backups (export/import), storage quota meter and the delete-everything danger zone. */
export function DataSection({ onResetApp }: Props) {
  const toast = useToast();
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
        toast({ message: 'Persistent storage enabled — your books and cards won’t be cleared under storage pressure.' });
      }
    }
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

  const [isClearOpen, setIsClearOpen] = useState(false);

  const handleClearAll = async () => {
    setIsClearOpen(false);
    await clearAllDatabase();
    onResetApp();
    toast({ message: 'All local data deleted.' });
  };

  return (
    <>
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
            <p className="text-xs text-stone-600 dark:text-stone-400">
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
            <p className="text-xs text-stone-600 dark:text-stone-400">
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
            <p className="text-xs text-stone-600 dark:text-stone-400">
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
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
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
              <span className="text-xs text-stone-600 dark:text-stone-400">
                {storageEstimate.isPersisted ? '✓ Persistent storage granted' : 'Standard temporary storage'}
              </span>

              {!storageEstimate.isPersisted && (
                <button
                  type="button"
                  onClick={handleRequestPersistence}
                  className="text-xs font-semibold text-stone-900 dark:text-stone-100 underline hover:opacity-80 cursor-pointer"
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
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Permanently wipes all books, flashcards, and reading statistics.
            </p>
          </div>

          <button
            onClick={() => setIsClearOpen(true)}
            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium border border-red-200 dark:border-red-900 transition-colors shrink-0"
          >
            Clear Database
          </button>
        </div>
      </section>
      <ConfirmDialog
        isOpen={isClearOpen}
        title="Delete all local data?"
        description="This permanently deletes every book, flashcard, note and your reading progress stored in this browser. Export a backup first if you might need it."
        confirmLabel="Delete everything"
        requireText="DELETE"
        onConfirm={handleClearAll}
        onCancel={() => setIsClearOpen(false)}
      />
      <ConfirmDialog
        isOpen={isClearOpen}
        title="Delete all local data?"
        description="This permanently deletes every book, flashcard, note and your reading progress stored in this browser. Export a backup first if you might need it."
        confirmLabel="Delete everything"
        requireText="DELETE"
        onConfirm={handleClearAll}
        onCancel={() => setIsClearOpen(false)}
      />
    </>
  );
}
