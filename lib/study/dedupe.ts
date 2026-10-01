import { FlashCard } from '../db/types';

/**
 * Normalizes text for comparison:
 * Lowercases, strips punctuation, normalizes multiple spaces, removes common stopwords.
 */
const COMMON_STOPWORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'of', 'for', 'to', 'with', 'by', 'as', 'what', 'how', 'why', 'who', 'when', 'where'
]);

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0 && !COMMON_STOPWORDS.has(word))
    .join(' ')
    .trim();
}

/**
 * Fast string hash for fingerprints
 */
export function generateFingerprint(text: string): string {
  const normalized = normalizeText(text);
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Compute k-shingles (word n-grams)
 */
export function getWordShingles(text: string, k: number = 2): Set<string> {
  const words = normalizeText(text).split(/\s+/).filter(Boolean);
  const shingles = new Set<string>();
  if (words.length <= k) {
    if (words.length > 0) shingles.add(words.join(' '));
    return shingles;
  }
  for (let i = 0; i <= words.length - k; i++) {
    shingles.add(words.slice(i, i + k).join(' '));
  }
  return shingles;
}

/**
 * Jaccard similarity between two sets of shingles
 */
export function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }
  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

export interface DedupeFilterResult {
  accepted: Array<Omit<FlashCard, 'id' | 'createdAt' | 'fsrs'>>;
  skippedCount: number;
  reasons: string[];
}

/**
 * Filters out duplicate cards using fingerprint match and near-duplicate shingle similarity
 */
export function filterDuplicateCards(
  candidateCards: Array<Omit<FlashCard, 'id' | 'createdAt' | 'fsrs'>>,
  existingCards: FlashCard[],
  similarityThreshold: number = 0.75
): DedupeFilterResult {
  const existingFingerprints = new Set(existingCards.map(c => c.fingerprint));
  const existingConceptKeys = new Map<string, Set<string>>();

  // Cache existing card shingles by concept
  const existingCardShingles = existingCards.map(c => ({
    conceptKey: c.conceptKey,
    shingles: getWordShingles(c.front, 2),
    fingerprint: c.fingerprint,
  }));

  const accepted: Array<Omit<FlashCard, 'id' | 'createdAt' | 'fsrs'>> = [];
  let skippedCount = 0;
  const reasons: string[] = [];

  for (const card of candidateCards) {
    const cardFingerprint = card.fingerprint || generateFingerprint(card.front);
    card.fingerprint = cardFingerprint;

    // Check 1: Exact fingerprint match against existing
    if (existingFingerprints.has(cardFingerprint)) {
      skippedCount++;
      reasons.push(`Exact match skipped: "${card.front.slice(0, 30)}..."`);
      continue;
    }

    // Check 2: Exact fingerprint match against already accepted in this batch
    if (accepted.some(a => a.fingerprint === cardFingerprint)) {
      skippedCount++;
      reasons.push(`Batch duplicate skipped: "${card.front.slice(0, 30)}..."`);
      continue;
    }

    // Check 3: Near-duplicate Jaccard similarity
    const cardShingles = getWordShingles(card.front, 2);
    let isNearDuplicate = false;

    for (const existing of existingCardShingles) {
      // If same concept key or high textual overlap
      const sim = calculateJaccardSimilarity(cardShingles, existing.shingles);
      if (sim >= similarityThreshold) {
        isNearDuplicate = true;
        reasons.push(`Near-duplicate (${Math.round(sim * 100)}% match) skipped: "${card.front.slice(0, 30)}..."`);
        break;
      }
    }

    if (isNearDuplicate) {
      skippedCount++;
      continue;
    }

    accepted.push(card);
    // Add to pool for subsequent candidate checks
    existingCardShingles.push({
      conceptKey: card.conceptKey,
      shingles: cardShingles,
      fingerprint: cardFingerprint,
    });
  }

  return { accepted, skippedCount, reasons };
}

/**
 * Computes hash of text + range + kind for the ledger
 */
export function computeInputHash(text: string, kind: string, batch: number = 1): string {
  const normalized = normalizeText(text.slice(0, 2000));
  let hash = 1779033703 ^ normalized.length;
  for (let i = 0; i < normalized.length; i++) {
    hash = Math.imul(hash ^ normalized.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return `${kind}_${(hash >>> 0).toString(16)}_b${batch}`;
}
