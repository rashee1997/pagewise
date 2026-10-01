import { ProviderConfig } from '../db/types';

export type AiTaskKind =
  | 'summary'
  | 'keyIdeas'
  | 'lessons'
  | 'cards'
  | 'quiz'
  | 'glossary'
  | 'explain_selection'
  | 'simplify_selection'
  | 'chat_assistant'
  | 'motivation';

export interface GenerateApiRequest {
  kind: AiTaskKind;
  chapterText: string;
  bookTitle?: string;
  author?: string;
  chapterTitle?: string;
  selectedText?: string;
  existingConceptKeys?: string[];
  existingQuestionFingerprints?: string[];
  userPrompt?: string;
  chatHistory?: Array<{ role: 'user' | 'model' | 'assistant'; text: string }>;
  provider?: ProviderConfig;
  batch?: number;
}

export interface SummaryOutput {
  headline: string;
  overview: string;
  takeaways: string[];
  outline: { title: string; summary: string }[];
}

export interface KeyIdeaOutput {
  title: string;
  explanation: string;
  quote?: string;
  actionableInsight?: string;
}

export interface CardOutput {
  type: 'basic' | 'cloze' | 'concept';
  front: string;
  back: string;
  hint?: string;
  conceptKey: string;
}

export interface QuizQuestionOutput {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface GlossaryOutput {
  term: string;
  definition: string;
  contextUsage?: string;
}
