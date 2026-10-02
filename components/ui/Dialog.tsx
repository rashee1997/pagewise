'use client';

import React, { useEffect, useRef, useId } from 'react';
import { useLatestRef } from '@/hooks/useLatestRef';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Accessible name. Rendered visibly unless `hideTitle` is set. */
  title: string;
  hideTitle?: boolean;
  /** Alignment of the panel: centered modal, top-aligned (palette), or right side sheet. */
  placement?: 'center' | 'top' | 'right';
  panelClassName?: string;
  /** Prevent closing via Esc/backdrop (e.g. while processing). */
  dismissible?: boolean;
  children: React.ReactNode;
}

/**
 * Accessible modal primitive: role="dialog", aria-modal, labelled, focus trap,
 * Esc + backdrop dismissal, focus restoration and body scroll lock.
 */
export function Dialog({
  isOpen,
  onClose,
  title,
  hideTitle = false,
  placement = 'center',
  panelClassName = '',
  dismissible = true,
  children,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useLatestRef(onClose);
  const dismissibleRef = useLatestRef(dismissible);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    // Move focus inside (respect autoFocus children)
    if (panel && !panel.contains(document.activeElement)) {
      const first = panel.querySelector<HTMLElement>('[data-autofocus]') || panel.querySelector<HTMLElement>(FOCUSABLE);
      (first || panel).focus();
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissibleRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        el => el.offsetParent !== null || el === document.activeElement
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === firstEl || document.activeElement === panel)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [isOpen, onCloseRef, dismissibleRef]);

  if (!isOpen) return null;

  const align =
    placement === 'top'
      ? 'items-start justify-center pt-[10vh] px-4'
      : placement === 'right'
      ? 'items-stretch justify-end'
      : 'items-center justify-center p-4';

  return (
    <div
      className={`fixed inset-0 z-(--z-modal) flex ${align} bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-150`}
      onMouseDown={e => {
        if (e.target === e.currentTarget && dismissible) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`outline-hidden ${panelClassName}`}
      >
        <h2 id={titleId} className={hideTitle ? 'sr-only' : 'text-lg font-bold text-stone-900 dark:text-stone-100'}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
