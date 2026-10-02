'use client';

import React, { useState, useEffect } from 'react';
import { useAbortableRequest, isAbortError } from '@/hooks/reader/useAbortableRequest';
import { Book, Chapter, QuizQuestion, AppSettings, FlashCard } from '@/lib/db/types';
import { getChapterMaterial, saveChapterMaterial, saveGenerationRecord } from '@/lib/db';
import { Sparkles, RefreshCw, CheckCircle2, XCircle, Award, AlertCircle, HelpCircle, PlusCircle } from 'lucide-react';
import { saveCards } from '@/lib/db';
import { createInitialFsrsState } from '@/lib/study/fsrs';
import { generateFingerprint } from '@/lib/study/dedupe';

interface QuizModeProps {
  book: Book;
  chapter: Chapter;
  settings: AppSettings;
}

function createQuizCard(
  bookId: string,
  chapterId: string,
  chapterTitle: string,
  q: QuizQuestion
): FlashCard {
  const cardFront = q.question;
  const cardBack = `${q.options[q.correctAnswerIndex]}\n\n${q.explanation}`;
  const now = Date.now();
  const rand = Math.random().toString(36).substring(2, 6);
  return {
    id: `card_${now}_${rand}`,
    bookId,
    chapterId,
    chapterTitle,
    type: 'concept' as const,
    front: cardFront,
    back: cardBack,
    conceptKey: `quiz-review-${now}`,
    fingerprint: generateFingerprint(cardFront),
    fsrs: createInitialFsrsState(),
    createdAt: now,
  };
}

export function QuizMode({ book, chapter, settings }: QuizModeProps) {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [addedCards, setAddedCards] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSaved() {
      const saved = await getChapterMaterial<QuizQuestion[]>(chapter.id, 'quiz');
      if (isMounted && saved) {
        setQuestions(saved);
        setSelectedAnswers({});
      } else if (isMounted) {
        setQuestions(null);
        setSelectedAnswers({});
      }
    }
    loadSaved();
    return () => {
      isMounted = false;
    };
  }, [chapter.id]);

  const nextSignal = useAbortableRequest();
  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setSelectedAnswers({});

    const signal = nextSignal();
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'quiz',
          chapterText: chapter.text,
          bookTitle: book.title,
          author: book.author,
          chapterTitle: chapter.title,
          provider: settings.provider,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to generate quiz.');
      }

      if (json.data && Array.isArray(json.data)) {
        const payload: QuizQuestion[] = json.data.map((q: any, i: number) => ({
          id: `quiz_q_${Date.now()}_${i}`,
          question: q.question,
          options: q.options || [],
          correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
          explanation: q.explanation || '',
        }));

        setQuestions(payload);
        await saveChapterMaterial(book.id, chapter.id, 'quiz', payload);
        await saveGenerationRecord({
          id: `rec_${chapter.id}_quiz_${Date.now()}`,
          bookId: book.id,
          chapterId: chapter.id,
          kind: 'quiz',
          inputHash: chapter.textHash,
          promptVersion: '1.0',
          batch: 1,
          createdAt: Date.now(),
        });
      } else {
        throw new Error('Could not parse quiz array from model response.');
      }
    } catch (err: any) {
      if (isAbortError(err)) return;
      console.error('Error generating quiz:', err);
      setError(err?.message || 'Failed to generate quiz.');
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  };

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (selectedAnswers[questionIndex] !== undefined) return; // locked once answered
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const handleAddAsFlashcard = async (questionIndex: number, q: QuizQuestion) => {
    const newCard = createQuizCard(book.id, chapter.id, chapter.title, q);
    await saveCards([newCard]);
    setAddedCards(prev => ({ ...prev, [questionIndex]: true }));
  };

  const handleAddAllMissedCards = async () => {
    if (!questions) return;
    const missed = questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => selectedAnswers[idx] !== undefined && selectedAnswers[idx] !== q.correctAnswerIndex && !addedCards[idx]);
    if (missed.length === 0) return;

    const newCards = missed.map(({ q }) => createQuizCard(book.id, chapter.id, chapter.title, q));
    await saveCards(newCards);

    setAddedCards(prev => {
      const next = { ...prev };
      missed.forEach(({ idx }) => {
        next[idx] = true;
      });
      return next;
    });
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
  };

  // Calculate score if all questions answered
  const totalQuestions = questions?.length || 0;
  const answeredCount = Object.keys(selectedAnswers).length;
  let correctCount = 0;
  if (questions) {
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) {
        correctCount++;
      }
    });
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Interactive Quiz
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Assess comprehension of {chapter.title}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {questions && answeredCount > 0 && (
            <button
              onClick={handleResetQuiz}
              className="px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
            >
              Reset Answers
            </button>
          )}

          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Crafting Quiz...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{questions ? 'Generate New Quiz' : 'Start Practice Quiz'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Score Banner when completed */}
      {questions && answeredCount === totalQuestions && totalQuestions > 0 && (() => {
        const missedUnsaved = questions.filter(
          (q, qIdx) => selectedAnswers[qIdx] !== undefined && selectedAnswers[qIdx] !== q.correctAnswerIndex && !addedCards[qIdx]
        );
        const totalMissed = questions.filter(
          (q, qIdx) => selectedAnswers[qIdx] !== undefined && selectedAnswers[qIdx] !== q.correctAnswerIndex
        ).length;

        return (
          <div className="p-5 bg-stone-100 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Quiz Complete: {correctCount} of {totalQuestions} correct ({Math.round((correctCount / totalQuestions) * 100)}%)
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  {correctCount === totalQuestions
                    ? 'Flawless recall! You have mastered this chapter.'
                    : 'Review the detailed explanations below to cement any weak points.'}
                </p>
              </div>
            </div>

            {totalMissed > 0 && (
              <div className="shrink-0 flex items-center gap-2">
                {missedUnsaved.length > 0 ? (
                  <button
                    onClick={handleAddAllMissedCards}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                    <span>Save All Missed to Deck ({missedUnsaved.length})</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-semibold rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>All Missed Questions Saved</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {isLoading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-36 bg-stone-100 dark:bg-stone-800 rounded-2xl p-6" />
          ))}
        </div>
      )}

      {!isLoading && questions && questions.length > 0 && (
        <div className="space-y-6">
          {questions.map((q, qIdx) => {
            const hasAnswered = selectedAnswers[qIdx] !== undefined;
            const chosenOption = selectedAnswers[qIdx];
            const isCorrect = chosenOption === q.correctAnswerIndex;

            return (
              <div
                key={q.id || qIdx}
                className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xs space-y-4"
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {qIdx + 1}
                  </span>
                  <h3 className="text-sm md:text-base font-bold text-stone-900 dark:text-stone-100 leading-snug">
                    {q.question}
                  </h3>
                </div>

                {/* Options List */}
                <div className="grid gap-2 pt-1 pl-9">
                  {q.options.map((opt, optIdx) => {
                    let optionStyle = 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200';

                    if (hasAnswered) {
                      if (optIdx === q.correctAnswerIndex) {
                        optionStyle = 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
                      } else if (chosenOption === optIdx && !isCorrect) {
                        optionStyle = 'border-red-400 bg-red-50/70 dark:bg-red-950/40 text-red-900 dark:text-red-200 line-through';
                      } else {
                        optionStyle = 'opacity-50 border-stone-200 dark:border-stone-800';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        disabled={hasAnswered}
                        onClick={() => handleSelectOption(qIdx, optIdx)}
                        className={`w-full p-3 text-left rounded-xl border text-xs md:text-sm transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                      >
                        <span>{opt}</span>
                        {hasAnswered && optIdx === q.correctAnswerIndex && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 ml-2" />
                        )}
                        {hasAnswered && chosenOption === optIdx && !isCorrect && (
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation reveal */}
                {hasAnswered && q.explanation && (
                  <div className="ml-9 p-3.5 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200/80 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300 leading-relaxed space-y-2">
                    <div>
                      <span className="font-semibold block mb-0.5 text-stone-800 dark:text-stone-200">
                        {isCorrect ? 'Correct!' : 'Explanation:'}
                      </span>
                      <span>{q.explanation}</span>
                    </div>

                    {!isCorrect && (
                      <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between">
                        <span className="text-xs text-stone-600 dark:text-stone-400">
                          Reinforce this concept with spaced repetition:
                        </span>
                        {addedCards[qIdx] ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Saved to Deck</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddAsFlashcard(qIdx, q)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>Add as Flashcard</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !questions && !error && (
        <div className="py-16 text-center space-y-3 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 p-8">
          <HelpCircle className="w-8 h-8 text-stone-600 dark:text-stone-400 mx-auto" />
          <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
            No quiz generated for this chapter yet
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto">
            Test yourself with multiple-choice questions grounded strictly in this chapter’s text.
          </p>
        </div>
      )}
    </div>
  );
}
