'use client';

import React, { useState } from 'react';
import { BookOpen, Sparkles, Layers, ArrowRight } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

export function OnboardingModal({ isOpen, onClose, onGetStarted }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Upload or Select Any Book',
      description: 'Drag and drop any PDF book. Pagewise automatically divides it into chapters, extracts clean text, and stores everything locally in your browser.',
      icon: <BookOpen className="w-8 h-8 text-stone-900 dark:text-stone-100" />,
      tagline: '100% Private · Zero Database',
    },
    {
      title: 'Distill and Study Chapters',
      description: 'Switch between distraction-free reading, executive summaries, mental models, interactive quizzes, and term definitions with zero hallucinated fluff.',
      icon: <Sparkles className="w-8 h-8 text-amber-500" />,
      tagline: 'Context-Aware AI Intelligence',
    },
    {
      title: 'Lock Knowledge with Spaced Repetition',
      description: 'Commit key ideas to long-term memory with FSRS-scheduled flashcards. Deduplication ensures you never review the same concept twice.',
      icon: <Layers className="w-8 h-8 text-emerald-500" />,
      tagline: 'Spaced Recall · Habit Streak',
    },
  ];

  const current = steps[step];

  const finish = () => {
    setStep(0);
    onClose();
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      finish();
      onGetStarted();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={finish}
      title={current.title}
      hideTitle
      panelClassName="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 space-y-6 shadow-2xl relative"
    >
      <div className="flex items-center gap-1.5" role="img" aria-label={`Step ${step + 1} of ${steps.length}`}>
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-[width] ${
              i === step ? 'w-8 bg-stone-900 dark:bg-stone-100' : 'w-2 bg-stone-200 dark:bg-stone-700'
            }`}
          />
        ))}
      </div>

      <div className="space-y-4" aria-live="polite">
        <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center" aria-hidden="true">
          {current.icon}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">{current.tagline}</p>
          <h3 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{current.title}</h3>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">{current.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800">
        <button
          onClick={finish}
          className="px-2 py-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
        >
          Skip tour
        </button>

        <button
          data-autofocus
          onClick={handleNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-sm font-semibold rounded-xl"
        >
          <span>{step === steps.length - 1 ? 'Add a book' : 'Next'}</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </Dialog>
  );
}
