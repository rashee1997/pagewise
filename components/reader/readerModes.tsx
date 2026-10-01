import React from 'react';
import { BookOpen, FileText, Lightbulb, Layers, HelpCircle, BookMarked, Compass } from 'lucide-react';

export type ReaderMode = 'read' | 'summary' | 'keyIdeas' | 'lessons' | 'cards' | 'quiz' | 'glossary';

export const MODE_BUTTONS: Array<{ id: ReaderMode; label: string; icon: React.ReactNode }> = [
  { id: 'read', label: 'Read', icon: <BookOpen className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: 'summary', label: 'Summary', icon: <FileText className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: 'keyIdeas', label: 'Key Ideas', icon: <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: 'lessons', label: 'Lessons', icon: <Compass className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: 'cards', label: 'Flashcards', icon: <Layers className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: 'quiz', label: 'Quiz', icon: <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: 'glossary', label: 'Glossary', icon: <BookMarked className="w-3.5 h-3.5" aria-hidden="true" /> },
];
