import { cleanPdfText } from '@/lib/pdf/clean';

/** Split raw PDF chapter text into readable paragraphs (falls back to ~400-char sentence chunks). */
export function formatChapterParagraphs(rawText: string): string[] {
  const cleaned = cleanPdfText(rawText);
  const rawParagraphs = cleaned.split(/\n\s*\n/);
  const formatted: string[] = [];

  for (const p of rawParagraphs) {
    const trimmed = p.replace(/\s+/g, ' ').trim();
    if (trimmed.length > 0) {
      formatted.push(trimmed);
    }
  }

  if (formatted.length <= 1 && cleaned.length > 300) {
    const sentences = cleaned.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [cleaned];
    let currentChunk = '';
    const chunks: string[] = [];
    for (const s of sentences) {
      currentChunk += (currentChunk ? ' ' : '') + s.trim();
      if (currentChunk.length > 400) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
    }
    if (currentChunk) chunks.push(currentChunk);
    if (chunks.length > 1) return chunks;
  }

  return formatted.length > 0 ? formatted : [cleaned];
}

export const normalizeQuote = (t: string) => t.replace(/\s+/g, ' ').trim();

export function isTypingTarget(el: EventTarget | null) {
  const node = el as HTMLElement | null;
  if (!node || !node.tagName) return false;
  return node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName);
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
