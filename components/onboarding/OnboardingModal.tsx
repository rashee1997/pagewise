'use client';

import React, { useState } from 'react';
import { BookOpen, Sparkles, Layers, ArrowRight, X, Check } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

export function OnboardingModal({ isOpen, onClose, onGetStarted }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

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

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      localStorage.setItem('pagewise_onboarded', 'true');
      onGetStarted();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-xs animate-in fade-in">
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 space-y-6 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? 'w-8 bg-stone-900 dark:bg-stone-100'
                  : 'w-2 bg-stone-200 dark:bg-stone-800'
              }`}
            />
          ))}
        </div>

        {/* Icon & Details */}
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
            {current.icon}
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              {current.tagline}
            </span>
            <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {current.title}
            </h2>
            <p className="text-xs md:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              {current.description}
            </p>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800">
          <button
            onClick={() => {
              localStorage.setItem('pagewise_onboarded', 'true');
              onClose();
            }}
            className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
          >
            Skip tour
          </button>

          <button
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
          >
            <span>{step === steps.length - 1 ? 'Start Reading' : 'Next'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
