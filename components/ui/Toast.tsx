'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** ms before auto-dismiss. 0 keeps it until dismissed. Default 6000. */
  duration?: number;
  tone?: 'neutral' | 'error';
}

interface ToastItem extends ToastOptions {
  id: number;
}

const ToastContext = createContext<(opts: ToastOptions) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const duration = item.duration ?? 6000;
  const remaining = useRef(duration);
  const startedAt = useRef(0);

  useEffect(() => {
    if (duration === 0 || paused) return;
    startedAt.current = Date.now();
    const t = setTimeout(() => onDismiss(item.id), remaining.current);
    return () => {
      clearTimeout(t);
      remaining.current = Math.max(500, remaining.current - (Date.now() - startedAt.current));
    };
  }, [paused, duration, item.id, onDismiss]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto [--focus:#fbbf24] dark:[--focus:#1d4ed8] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm animate-in fade-in slide-in-from-bottom-2 duration-200 ${
        item.tone === 'error'
          ? 'bg-red-700 text-white'
          : 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900'
      }`}
    >
      <span className="min-w-0">{item.message}</span>
      {item.actionLabel && (
        <button
          onClick={() => {
            item.onAction?.();
            onDismiss(item.id);
          }}
          className="px-2.5 py-1 min-h-8 bg-amber-300 text-stone-950 rounded-lg font-bold hover:bg-amber-200 shrink-0"
        >
          {item.actionLabel}
        </button>
      )}
      <button
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="p-1.5 -mr-1 rounded-lg opacity-80 hover:opacity-100 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setItems(prev => prev.filter(t => t.id !== id)), []);
  const push = useCallback((opts: ToastOptions) => {
    counter.current += 1;
    const id = counter.current;
    setItems(prev => [...prev.slice(-2), { ...opts, id }]);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      {/* Sits above the mobile bottom nav (≈4.5rem) and the safe area */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 z-(--z-toast) flex flex-col items-center gap-2 px-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-6"
      >
        {items.map(item => (
          <ToastView key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
