import { Chapter, Book, FlashCard, AppSettings } from '../db/types';
import {
  getGenerationRecord,
  saveGenerationRecord,
  getChapterMaterial,
  saveChapterMaterial,
  getAllCards,
  saveCards,
} from '../db';
import { computeInputHash, filterDuplicateCards, generateFingerprint } from './dedupe';
import { createInitialFsrsState } from './fsrs';
import { PROMPT_VERSION } from '../ai/prompts';
import { CardsSchema } from '../ai/schemas';

export interface StudyOrchestratorResult<T> {
  data: T;
  isCached: boolean;
  skippedDuplicates?: number;
}

/**
 * Orchestrates chapter study generation with the 4-layer deduplication ledger:
 * Layer 1: Job ledger check (returns cached data instantly with 0 API calls if available)
 * Layer 2: Prompt level exclusion of existing concept keys
 * Layer 3: Exact fingerprint deduplication
 * Layer 4: Token-shingle Jaccard near-duplicate filtering (>= 0.75)
 */
export async function getOrGenerateStudyMaterial<T>(
  kind: 'summary' | 'keyIdeas' | 'quiz' | 'glossary',
  book: Book,
  chapter: Chapter,
  settings: AppSettings,
  batch: number = 1,
  abortSignal?: AbortSignal
): Promise<StudyOrchestratorResult<T>> {
  const inputHash = computeInputHash(chapter.text, kind, batch);

  // Check Layer 1 Ledger: If record already exists for this prompt version and batch 1
  if (batch === 1) {
    const existingRecord = await getGenerationRecord(chapter.id, kind, 1);
    if (existingRecord && existingRecord.promptVersion === PROMPT_VERSION) {
      const cached = await getChapterMaterial<T>(chapter.id, kind);
      if (cached) {
        return { data: cached, isCached: true };
      }
    }
  }

  // Not cached or generate more requested: Call API
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortSignal,
    body: JSON.stringify({
      kind,
      chapterText: chapter.text,
      bookTitle: book.title,
      author: book.author,
      chapterTitle: chapter.title,
      provider: settings.provider,
      batch,
    }),
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || `Failed to generate ${kind}`);
  }

  const payload: T = json.data;

  // Persist material and ledger record
  await saveChapterMaterial(book.id, chapter.id, kind, payload);
  await saveGenerationRecord({
    id: `rec_${chapter.id}_${kind}_b${batch}_${Date.now()}`,
    bookId: book.id,
    chapterId: chapter.id,
    kind,
    inputHash,
    promptVersion: PROMPT_VERSION,
    batch,
    createdAt: Date.now(),
  });

  return { data: payload, isCached: false };
}

/**
 * Flashcard generation orchestrator with strict deduplication
 */
export async function generateDeduplicatedFlashcards(
  book: Book,
  chapter: Chapter,
  settings: AppSettings,
  batch: number = 1,
  abortSignal?: AbortSignal
): Promise<{ newCards: FlashCard[]; skippedDuplicates: number; isCached: boolean }> {
  const existingCards = await getAllCards(book.id);
  const chapterCards = existingCards.filter(c => c.chapterId === chapter.id);

  // Check ledger for batch 1
  if (batch === 1 && chapterCards.length > 0) {
    const existingRecord = await getGenerationRecord(chapter.id, 'cards', 1);
    if (existingRecord && existingRecord.promptVersion === PROMPT_VERSION) {
      return { newCards: chapterCards, skippedDuplicates: 0, isCached: true };
    }
  }

  const existingConceptKeys = existingCards.map(c => c.conceptKey).filter(Boolean);

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortSignal,
    body: JSON.stringify({
      kind: 'cards',
      chapterText: chapter.text,
      bookTitle: book.title,
      author: book.author,
      chapterTitle: chapter.title,
      existingConceptKeys,
      provider: settings.provider,
      batch,
    }),
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || 'Failed to generate flashcards');
  }

  // Normalize data payload
  const rawCardsArray = Array.isArray(json.data) ? json.data : json.data?.cards || [];

  // Validate with Zod
  const validated = CardsSchema.safeParse({ cards: rawCardsArray });
  const rawCards = validated.success ? validated.data.cards : rawCardsArray;

  const candidateCards = rawCards.map((c: any) => ({
    bookId: book.id,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    type: (c.type === 'concept' || c.type === 'cloze' ? c.type : 'basic') as any,
    front: c.front || '',
    back: c.back || '',
    hint: c.hint || undefined,
    conceptKey: c.conceptKey || `concept-${Date.now()}`,
    fingerprint: generateFingerprint(c.front || ''),
  }));

  // Filter against existing cards across the book
  const { accepted, skippedCount } = filterDuplicateCards(candidateCards, existingCards);

  const newFlashCards: FlashCard[] = accepted.map(c => ({
    ...c,
    id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    fsrs: createInitialFsrsState(),
    createdAt: Date.now(),
  }));

  if (newFlashCards.length > 0) {
    await saveCards(newFlashCards);
    await saveGenerationRecord({
      id: `rec_${chapter.id}_cards_b${batch}_${Date.now()}`,
      bookId: book.id,
      chapterId: chapter.id,
      kind: 'cards',
      inputHash: computeInputHash(chapter.text, 'cards', batch),
      promptVersion: PROMPT_VERSION,
      batch,
      createdAt: Date.now(),
    });
  }

  return {
    newCards: newFlashCards,
    skippedDuplicates: skippedCount,
    isCached: false,
  };
}
