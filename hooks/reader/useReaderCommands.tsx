import React, { useEffect, MutableRefObject } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  List,
  StickyNote,
  Sparkles,
  Maximize2,
  SlidersHorizontal,
  FileType,
  BookOpen,
} from 'lucide-react';
import type { Command } from '@/components/navigation/CommandPalette';
import { MODE_BUTTONS } from '@/components/reader/readerModes';
import type { ReaderActions } from '@/components/reader/readerActions';
import type { Chapter } from '@/lib/db/types';

/** Registers reader commands (chapters, modes, tools) with the global command menu. */
export function useReaderCommands(
  chapters: Chapter[],
  hasPdf: boolean | undefined,
  actionsRef: MutableRefObject<ReaderActions>,
  onRegisterCommands?: (commands: Command[]) => void
) {
  useEffect(() => {
    if (!onRegisterCommands) return;
    const a = () => actionsRef.current;
    const cmds: Command[] = [
      { id: 'rd-next', group: 'Reader', label: 'Next chapter', shortcut: ']', icon: <ChevronRight className="w-4 h-4" />, run: () => a().next() },
      { id: 'rd-prev', group: 'Reader', label: 'Previous chapter', shortcut: '[', icon: <ChevronLeft className="w-4 h-4" />, run: () => a().prev() },
      { id: 'rd-outline', group: 'Reader', label: 'Chapters outline', icon: <List className="w-4 h-4" />, keywords: 'toc contents', run: () => a().openOutline() },
      { id: 'rd-notes', group: 'Reader', label: 'Highlights & notes', icon: <StickyNote className="w-4 h-4" />, run: () => a().openNotes() },
      { id: 'rd-ai', group: 'Reader', label: 'Open AI study assistant', shortcut: '⌘J', icon: <Sparkles className="w-4 h-4" />, keywords: 'chat ask', run: () => a().toggleAssistant() },
      { id: 'rd-focus', group: 'Reader', label: 'Toggle focus mode', shortcut: 'F', icon: <Maximize2 className="w-4 h-4" />, run: () => a().toggleFocus() },
      { id: 'rd-prefs', group: 'Reader', label: 'Reading appearance', icon: <SlidersHorizontal className="w-4 h-4" />, keywords: 'font size theme width', run: () => a().openPrefs() },
      ...MODE_BUTTONS.map<Command>((m, i) => ({
        id: `rd-mode-${m.id}`,
        group: 'Reader',
        label: `Switch to ${m.label}`,
        shortcut: String(i + 1),
        icon: m.icon,
        keywords: 'mode study',
        run: () => a().setMode(m.id),
      })),
      ...(hasPdf
        ? [{ id: 'rd-pdf', group: 'Reader', label: 'Toggle original PDF view', icon: <FileType className="w-4 h-4" />, run: () => a().togglePdf() } as Command]
        : []),
      ...chapters.map<Command>((ch, i) => ({
        id: `rd-ch-${ch.id}`,
        group: 'Chapters',
        label: ch.title,
        detail: `Chapter ${i + 1}`,
        icon: <BookOpen className="w-4 h-4" />,
        keywords: `chapter ${i + 1} ch ${i + 1} go to`,
        run: () => a().goTo(i),
      })),
    ];
    onRegisterCommands(cmds);
    return () => onRegisterCommands([]);
  }, [chapters, hasPdf, actionsRef, onRegisterCommands]);
}
