'use client';

import React from 'react';
import { AppSettings, Book, Chapter } from '@/lib/db/types';
import { SummaryMode } from './SummaryMode';
import { KeyIdeasMode } from './KeyIdeasMode';
import { LessonsMode } from './LessonsMode';
import { CardsMode } from './CardsMode';
import { QuizMode } from './QuizMode';
import { GlossaryMode } from './GlossaryMode';
import type { ReaderMode } from './readerModes';

interface ReaderModePanelProps {
  mode: Exclude<ReaderMode, 'read'>;
  book: Book;
  chapter: Chapter;
  settings: AppSettings;
}

/** Renders the AI study surface for the active (non-Read) mode. */
export function ReaderModePanel({ mode, book, chapter, settings }: ReaderModePanelProps) {
  const props = { book, chapter, settings };
  switch (mode) {
    case 'summary':
      return <SummaryMode {...props} />;
    case 'keyIdeas':
      return <KeyIdeasMode {...props} />;
    case 'lessons':
      return <LessonsMode {...props} />;
    case 'cards':
      return <CardsMode {...props} />;
    case 'quiz':
      return <QuizMode {...props} />;
    case 'glossary':
      return <GlossaryMode {...props} />;
  }
}
