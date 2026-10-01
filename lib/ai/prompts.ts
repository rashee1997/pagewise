export const PROMPT_VERSION = '1.0.0';

/**
 * System and task prompts for study material generation:
 * - Plain language style ("explain to a smart beginner")
 * - Source page numbers where appropriate
 * - Strictly grounded: no invented facts ("use only the given text")
 */

export const SYSTEM_STUDY_PROMPT = `You are Pagewise, a master educator and study companion.
Rules:
1. Explain to a smart beginner: clear, accessible, and deep.
2. Grounded strictly in the source text: do NOT hallucinate or invent outside facts.
3. Every insight must be anchored to the author's arguments.
4. Output valid JSON adhering strictly to the requested schema.`;

export function buildSummaryPrompt(bookTitle: string, author: string, chapterTitle: string, text: string): string {
  return `Book: "${bookTitle}" by ${author}
Chapter: "${chapterTitle}"
Prompt Version: ${PROMPT_VERSION}

Source Text:
${text}

Task: Produce a structured chapter summary.
Include:
- "headline": Core thesis or big takeaway (max 200 chars).
- "overview": 2-3 clear paragraphs explaining the flow and logic.
- "takeaways": 4-6 high impact bullet points.
- "outline": Chronological section titles and 1-line summaries.`;
}

export function buildKeyIdeasPrompt(bookTitle: string, chapterTitle: string, text: string): string {
  return `Book: "${bookTitle}"
Chapter: "${chapterTitle}"
Prompt Version: ${PROMPT_VERSION}

Source Text:
${text}

Task: Extract 4-7 primary mental models, core ideas, or principles.
For each idea provide:
- "title": Clean descriptive title.
- "explanation": Why it matters and how the author argues it.
- "quote": (Optional) Exact memorable excerpt from the text.
- "actionableInsight": How a reader can apply this concept in real life.`;
}

export function buildCardsPrompt(
  bookTitle: string,
  chapterTitle: string,
  text: string,
  batch: number = 1,
  existingConceptKeys: string[] = []
): string {
  const existingNotice =
    existingConceptKeys.length > 0
      ? `IMPORTANT: Existing flashcards already cover: [${existingConceptKeys.join(', ')}]. DO NOT repeat them. Focus on NEW angles, nuanced details, and counter-intuitive facts.`
      : '';

  return `Book: "${bookTitle}"
Chapter: "${chapterTitle}"
Batch: ${batch}
Prompt Version: ${PROMPT_VERSION}
${existingNotice}

Source Text:
${text}

Task: Create 6-12 high-yield active recall flashcards.
Output JSON object with a "cards" array where each object has:
- "type": "basic" | "concept" | "cloze"
- "front": Clear question or active recall prompt (min 5, max 300 chars).
- "back": Concise, memorable answer with key reasoning (min 1, max 600 chars).
- "hint": (Optional) Mnemonic or clue.
- "conceptKey": Hyphenated slug between 3 and 60 lowercase letters/numbers (e.g. "moral-law-definition", "delayed-gratification").`;
}

export function buildQuizPrompt(bookTitle: string, chapterTitle: string, text: string): string {
  return `Book: "${bookTitle}"
Chapter: "${chapterTitle}"
Prompt Version: ${PROMPT_VERSION}

Source Text:
${text}

Task: Create a 5-question multiple choice test evaluating deep comprehension.
Output a JSON array where each object has:
- "question": Direct question.
- "options": Array of 4 distinct choices.
- "correctAnswerIndex": Integer from 0 to 3.
- "explanation": Plain-language explanation of why this answer is correct and why other choices fail.`;
}

export function buildGlossaryPrompt(bookTitle: string, chapterTitle: string, text: string): string {
  return `Book: "${bookTitle}"
Chapter: "${chapterTitle}"
Prompt Version: ${PROMPT_VERSION}

Source Text:
${text}

Task: Extract 5-10 key vocabulary words, technical terms, or specialized concepts used in this chapter.
Output a JSON array where each object has:
- "term": The word or phrase.
- "definition": Plain English definition in modern terms.
- "contextUsage": How the author used it in this chapter.`;
}
