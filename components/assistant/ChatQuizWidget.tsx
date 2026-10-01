'use client';

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export function ChatQuizWidget({ quiz }: { quiz: { question: string; options: string[]; correctAnswerIndex: number; explanation: string } }) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <div className="max-w-[85%] p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs space-y-3 shadow-xs my-2">
      <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
        <HelpCircle className="w-4 h-4 text-emerald-700" />
        <span>Interactive Quiz Check</span>
      </div>
      <p className="font-medium text-stone-800 dark:text-stone-200">
        {quiz.question}
      </p>
      <div role="radiogroup" aria-label={quiz.question} className="space-y-1.5 pt-1">
        {quiz.options.map((opt, optIdx) => {
          let btnStyle = 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200';
          if (isSubmitted) {
            if (optIdx === quiz.correctAnswerIndex) {
              btnStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold';
            } else if (selectedOption === optIdx) {
              btnStyle = 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200';
            }
          } else if (selectedOption === optIdx) {
            btnStyle = 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950';
          }

          return (
            <button
              key={optIdx}
              role="radio"
              aria-checked={selectedOption === optIdx}
              onClick={() => {
                if (!isSubmitted) setSelectedOption(optIdx);
              }}
              className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors flex items-center justify-between cursor-pointer ${btnStyle}`}
            >
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {!isSubmitted ? (
        <button
          onClick={() => {
            if (selectedOption !== null) setIsSubmitted(true);
          }}
          disabled={selectedOption === null}
          className="w-full py-2 bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer"
        >
          Submit Answer
        </button>
      ) : (
        <div role="status" className="p-3 bg-stone-50 dark:bg-stone-950 rounded-lg border border-stone-200 dark:border-stone-800 space-y-1 text-xs text-stone-600 dark:text-stone-400">
          <p className="font-semibold text-stone-900 dark:text-stone-100">
            {selectedOption === quiz.correctAnswerIndex ? 'Correct! Excellent recall.' : 'Incorrect.'}
          </p>
          <p>{quiz.explanation}</p>
        </div>
      )}
    </div>
  );
}
