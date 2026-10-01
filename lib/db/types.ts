export type BookStatus = 'processing' | 'ready' | 'error';

export interface Book {
  id: string;
  title: string;
  author?: string;
  pageCount: number;
  chapterCount: number;
  fileHash: string; // sha256 or pseudo-hash to block duplicate uploads
  addedAt: number;
  lastOpenedAt: number;
  coverDataUrl?: string;
  pdfDataUrl?: string; // legacy: transient blob URL (no longer persisted)
  chapterProgress?: Record<string, number>; // chapterId -> furthest read fraction (0-1)
  hasPdf?: boolean; // original PDF blob stored in the pdfFiles table
  progress: {
    chapterId?: string;
    chapterIndex?: number;
    page: number;
    percent: number;
    scrollFraction?: number; // 0-1 position inside the current chapter
  };
  status: BookStatus;
  statusMessage?: string;
}

export interface Chapter {
  id: string;
  bookId: string;
  index: number;
  title: string;
  startPage: number;
  endPage: number;
  text: string;
  textHash: string;
  tokenEstimate: number;
}

export type CardType = 'basic' | 'cloze' | 'concept';

export interface FsrsState {
  state: number; // 0: New, 1: Learning, 2: Review, 3: Relearning
  due: number; // timestamp ms
  stability: number; // days
  difficulty: number; // 1-10
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  last_review: number; // timestamp ms
}

export interface FlashCard {
  id: string;
  bookId: string;
  chapterId: string;
  chapterTitle?: string;
  sourceNoteId?: string;
  sourceAnchor?: {
    paragraphIndex?: number;
    quoteSnippet?: string;
    charOffsetStart?: number;
    charOffsetEnd?: number;
  };
  type: CardType;
  front: string;
  back: string;
  hint?: string;
  conceptKey: string;
  fingerprint: string;
  sourcePage?: number;
  fsrs: FsrsState;
  createdAt: number;
  suspended?: boolean;
}

export interface GenerationRecord {
  id: string;
  bookId: string;
  chapterId: string;
  kind: 'summary' | 'keyIdeas' | 'lessons' | 'cards' | 'quiz' | 'glossary' | 'audioOverview';
  inputHash: string;
  promptVersion: string;
  batch: number;
  createdAt: number;
}

export interface ChapterSummary {
  headline: string;
  overview: string;
  takeaways: string[];
  outline: { title: string; summary: string }[];
}

export interface KeyIdea {
  title: string;
  explanation: string;
  quote?: string;
  actionableInsight?: string;
}

export interface Lesson {
  title: string;
  corePrinciple: string;
  context: string;
  actionableStep: string;
  isManual?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface GlossaryItem {
  term: string;
  definition: string;
  contextUsage?: string;
}

export interface AudioDialogueTurn {
  speaker: 'guide' | 'analyst';
  speakerName: string;
  text: string;
}

export interface AudioOverviewData {
  title: string;
  durationEstimate: string;
  turns: AudioDialogueTurn[];
}

export interface ChapterMaterial {
  id: string;
  chapterId: string;
  bookId: string;
  kind: 'summary' | 'keyIdeas' | 'lessons' | 'quiz' | 'glossary' | 'audioOverview';
  payload: ChapterSummary | KeyIdea[] | Lesson[] | QuizQuestion[] | GlossaryItem[] | AudioOverviewData;
  createdAt: number;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  bookId: string;
  rating: 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy
  reviewedAt: number;
  durationMs?: number;
}

export interface Note {
  id: string;
  bookId: string;
  chapterId: string;
  page?: number;
  quote?: string;
  text: string;
  createdAt: number;
}

export interface PdfFile {
  bookId: string;
  blob: Blob;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  date: string; // YYYY-MM-DD
  seconds: number;
  pages: number;
}

export interface DailyMotivation {
  date: string;
  text: string;
  author?: string;
  hash: string;
}

export type ProviderKind = 'default' | 'custom';

export interface ProviderConfig {
  kind: ProviderKind;
  baseURL?: string;
  apiKey?: string;
  model?: string; // Default / Primary model
  fallbackModel?: string; // Fallback model if primary model fails (e.g. 503 high demand or 429)
  models?: string[]; // Multiple models registered in this provider
  label?: string;
}

export interface AppSettings {
  id: string;
  provider: ProviderConfig;
  dailyGoalMinutes: number;
  reminderTime?: string;
  theme: 'system' | 'light' | 'dark';
  readerTheme: 'paper' | 'dark' | 'clean' | 'sepia';
  readerFontSize: 'sm' | 'md' | 'lg' | 'xl';
  readerFontFamily: 'serif' | 'sans';
  readerLineWidth: 'narrow' | 'normal' | 'wide';
  ttsVoiceName?: string;
  ttsRate: number;
  targetRetention?: number; // Desired retention rate (0.80 - 0.95, default 0.90)
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
}
