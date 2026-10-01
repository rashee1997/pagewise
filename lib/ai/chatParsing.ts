/** Pull a balanced {...} JSON object containing a "question" key out of free text. */
export function extractQuizJson(text: string): { raw: string; value: any } | null {
  const qIdx = text.indexOf('"question"');
  if (qIdx < 0) return null;
  for (let start = text.lastIndexOf('{', qIdx); start >= 0; start = text.lastIndexOf('{', start - 1)) {
    let depth = 0;
    let inStr = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (ch === '\\') i++;
        else if (ch === '"') inStr = false;
      } else if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) {
        const raw = text.slice(start, i + 1);
        try {
          const value = JSON.parse(raw);
          if (value.question && Array.isArray(value.options) && typeof value.correctAnswerIndex === 'number') {
            return { raw, value };
          }
        } catch {
          // not valid JSON; try an outer brace
        }
        break;
      }
    }
  }
  return null;
}

/** Detect an explicit Front/Back (or Q/A) card on separate lines; ordinary prose containing "A:" is ignored. */
export function extractCard(text: string): { front: string; back: string; conceptKey: string } | undefined {
  const q = text.match(/^\s*(?:[-*]\s*)?(?:\*\*)?(?:Front|Question|Q)(?:\*\*)?\s*:\s*(.+)$/im);
  if (!q) return undefined;
  const after = text.slice((q.index ?? 0) + q[0].length);
  const a = after.match(/^\s*(?:[-*]\s*)?(?:\*\*)?(?:Back|Answer|A)(?:\*\*)?\s*:\s*(.+)$/im);
  if (!a || (a.index ?? 0) > 3) return undefined;
  return { front: q[1].replace(/\*\*/g, '').trim(), back: a[1].replace(/\*\*/g, '').trim(), conceptKey: 'assistant-generated' };
}
