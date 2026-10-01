'use client';

import React, { useState } from 'react';
import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** When set, the user must type this text before the confirm button enables. */
  requireText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Replaces window.confirm(): labelled, focus-trapped, keyboard-safe (focus lands on Cancel). */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  requireText,
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      panelClassName="w-full max-w-md bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 space-y-4"
    >
      {/* Dialog unmounts its children when closed, so the typed text resets on every open */}
      <ConfirmBody
        description={description}
        confirmLabel={confirmLabel}
        requireText={requireText}
        destructive={destructive}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </Dialog>
  );
}

function ConfirmBody({
  description,
  confirmLabel,
  requireText,
  destructive,
  onConfirm,
  onCancel,
}: Omit<ConfirmDialogProps, 'isOpen' | 'title'>) {
  const [typed, setTyped] = useState('');
  const canConfirm = !requireText || typed.trim() === requireText;

  return (
    <>
      <p className="text-sm text-stone-600 dark:text-stone-400">{description}</p>

      {requireText && (
        <div className="space-y-1.5">
          <label htmlFor="confirm-text" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Type <span className="font-mono">{requireText}</span> to confirm
          </label>
          <input
            id="confirm-text"
            type="text"
            autoComplete="off"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl"
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          data-autofocus
          onClick={onCancel}
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={!canConfirm}
          className={`px-4 py-2 text-sm font-semibold rounded-xl disabled:opacity-40 ${
            destructive ? 'bg-red-700 text-white hover:bg-red-800' : 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </>
  );
}
