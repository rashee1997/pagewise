'use client';

import React, { useState, useEffect } from 'react';
import { Book, Chapter, Lesson, AppSettings } from '@/lib/db/types';
import { getChapterMaterial, saveChapterMaterial, saveGenerationRecord } from '@/lib/db';
import { Sparkles, RefreshCw, Compass, Plus, Trash2, CheckCircle2, AlertCircle, BookOpen, Edit3, X } from 'lucide-react';

interface LessonsModeProps {
  book: Book;
  chapter: Chapter;
  settings: AppSettings;
}

export function LessonsMode({ book, chapter, settings }: LessonsModeProps) {
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual lesson creation state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualCorePrinciple, setManualCorePrinciple] = useState('');
  const [manualContext, setManualContext] = useState('');
  const [manualActionableStep, setManualActionableStep] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadSaved() {
      const saved = await getChapterMaterial<Lesson[]>(chapter.id, 'lessons');
      if (isMounted && saved) {
        setLessons(saved);
      } else if (isMounted) {
        setLessons(null);
      }
    }
    loadSaved();
    return () => {
      isMounted = false;
    };
  }, [chapter.id]);

  const handleGenerateAiLessons = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'lessons',
          chapterText: chapter.text,
          bookTitle: book.title,
          author: book.author,
          chapterTitle: chapter.title,
          provider: settings.provider,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to extract lessons.');
      }

      if (json.data && Array.isArray(json.data)) {
        const aiLessons: Lesson[] = json.data.map((item: any) => ({
          title: item.title || 'Lesson',
          corePrinciple: item.corePrinciple || '',
          context: item.context || '',
          actionableStep: item.actionableStep || '',
          isManual: false,
        }));

        // Merge with any existing manual lessons if present, or set
        const currentList = lessons || [];
        const manualOnly = currentList.filter(l => l.isManual);
        const combined = [...aiLessons, ...manualOnly];

        setLessons(combined);
        await saveChapterMaterial(book.id, chapter.id, 'lessons', combined);
        await saveGenerationRecord({
          id: `rec_${chapter.id}_lessons_${Date.now()}`,
          bookId: book.id,
          chapterId: chapter.id,
          kind: 'lessons',
          inputHash: chapter.textHash,
          promptVersion: '1.0',
          batch: 1,
          createdAt: Date.now(),
        });
      } else {
        throw new Error('Could not parse lessons from model response.');
      }
    } catch (err: any) {
      console.error('Error generating lessons:', err);
      setError(err?.message || 'Failed to extract lessons with AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddManualLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualCorePrinciple.trim()) return;

    const newLesson: Lesson = {
      title: manualTitle.trim(),
      corePrinciple: manualCorePrinciple.trim(),
      context: manualContext.trim(),
      actionableStep: manualActionableStep.trim(),
      isManual: true,
    };

    const currentList = lessons || [];
    const updated = [newLesson, ...currentList];
    setLessons(updated);
    await saveChapterMaterial(book.id, chapter.id, 'lessons', updated);

    // Reset form
    setManualTitle('');
    setManualCorePrinciple('');
    setManualContext('');
    setManualActionableStep('');
    setIsModalOpen(false);
  };

  const handleDeleteLesson = async (index: number) => {
    if (!lessons) return;
    const updated = lessons.filter((_, idx) => idx !== index);
    setLessons(updated.length > 0 ? updated : null);
    await saveChapterMaterial(book.id, chapter.id, 'lessons', updated);
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Chapter Lessons & Takeaways
          </h2>
          <p className="text-xs text-stone-500">
            {chapter.title} · Extracted via AI or added manually
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Manual Lesson</span>
          </button>

          <button
            onClick={handleGenerateAiLessons}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Extracting AI Lessons...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lessons && lessons.length > 0 ? 'Regenerate AI Lessons' : 'Extract AI Lessons'}</span>
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

      {isLoading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-36 bg-stone-100 dark:bg-stone-800 rounded-2xl p-6" />
          ))}
        </div>
      )}

      {/* Lessons List */}
      {!isLoading && lessons && lessons.length > 0 && (
        <div className="grid gap-5">
          {lessons.map((lesson, idx) => (
            <div
              key={idx}
              className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xs space-y-3 relative group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-stone-900 dark:text-stone-100">
                      {lesson.title}
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">
                      {lesson.isManual ? 'Manual Entry' : 'AI Extracted'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteLesson(idx)}
                  className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  title="Delete lesson"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {lesson.corePrinciple && (
                <div className="text-sm font-serif italic text-stone-800 dark:text-stone-200 pl-3 border-l-2 border-emerald-500">
                  &ldquo;{lesson.corePrinciple}&rdquo;
                </div>
              )}

              {lesson.context && (
                <p className="text-xs md:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {lesson.context}
                </p>
              )}

              {lesson.actionableStep && (
                <div className="flex items-start gap-2 text-xs text-emerald-900 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="font-semibold block mb-0.5">Actionable Takeaway:</span>
                    <span>{lesson.actionableStep}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!lessons || lessons.length === 0) && !error && (
        <div className="py-16 text-center space-y-4 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 p-8">
          <Compass className="w-8 h-8 text-stone-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
              No lessons recorded for this chapter yet
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Extract structured takeaways automatically with AI or add your own manual observations.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Add Manual Lesson
            </button>
            <button
              onClick={handleGenerateAiLessons}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:text-stone-950 text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
            >
              Extract AI Lessons
            </button>
          </div>
        </div>
      )}

      {/* Manual Lesson Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 overflow-hidden p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Add Manual Lesson
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddManualLesson} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={e => setManualTitle(e.target.value)}
                  placeholder="e.g. The Power of Compounding Habits"
                  className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Core Principle / Quote
                </label>
                <input
                  type="text"
                  value={manualCorePrinciple}
                  onChange={e => setManualCorePrinciple(e.target.value)}
                  placeholder="Summary quote or core principle statement"
                  className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Context / Explanation
                </label>
                <textarea
                  rows={3}
                  value={manualContext}
                  onChange={e => setManualContext(e.target.value)}
                  placeholder="Why does this lesson matter in the context of the chapter?"
                  className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Actionable Takeaway
                </label>
                <input
                  type="text"
                  value={manualActionableStep}
                  onChange={e => setManualActionableStep(e.target.value)}
                  placeholder="How can you apply this lesson today?"
                  className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!manualTitle.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Save Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
