import Dexie, { Table } from 'dexie';
import {
  Book,
  Chapter,
  FlashCard,
  GenerationRecord,
  ChapterMaterial,
  ReviewLog,
  Note,
  ReadingSession,
  DailyMotivation,
  AppSettings,
  FsrsState,
} from './types';
import { createInitialFsrsState } from '../study/fsrs';

export class PagewiseDatabase extends Dexie {
  books!: Table<Book, string>;
  chapters!: Table<Chapter, string>;
  cards!: Table<FlashCard, string>;
  generationRecords!: Table<GenerationRecord, string>;
  chapterMaterials!: Table<ChapterMaterial, string>;
  reviewLogs!: Table<ReviewLog, string>;
  notes!: Table<Note, string>;
  readingSessions!: Table<ReadingSession, string>;
  dailyMotivations!: Table<DailyMotivation, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('pagewise_db');
    this.version(1).stores({
      books: 'id, addedAt, lastOpenedAt, fileHash, status',
      chapters: 'id, bookId, index',
      cards: 'id, bookId, chapterId, [bookId+chapterId], fingerprint',
      generationRecords: 'id, bookId, chapterId, [chapterId+kind], inputHash',
      chapterMaterials: 'id, chapterId, bookId, kind, [chapterId+kind]',
      reviewLogs: 'id, cardId, bookId, reviewedAt',
      notes: 'id, bookId, chapterId, createdAt',
      readingSessions: 'id, bookId, date',
      dailyMotivations: 'date, hash',
      settings: 'id',
    });
  }
}

export const db = new PagewiseDatabase();

// Default App Settings
export const DEFAULT_SETTINGS: AppSettings = {
  id: 'current_settings',
  provider: {
    kind: 'default',
    model: 'gemini-3.8-flash',
    fallbackModel: 'gemini-3.1-flash-lite',
    models: ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.1-pro-preview'],
  },
  dailyGoalMinutes: 20,
  reminderTime: '20:00',
  theme: 'system',
  readerTheme: 'paper',
  readerFontSize: 'md',
  readerFontFamily: 'serif',
  readerLineWidth: 'normal',
  ttsRate: 1.0,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
};

// Database Query & Operation Helpers

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const stored = await db.settings.get('current_settings');
    if (stored) return stored;
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch (e) {
    console.warn('Error reading settings from IndexedDB, falling back to default', e);
    return DEFAULT_SETTINGS;
  }
}

export async function updateAppSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getAppSettings();
  const updated: AppSettings = { ...current, ...partial };
  await db.settings.put(updated);
  return updated;
}

export async function getAllBooks(): Promise<Book[]> {
  return await db.books.orderBy('lastOpenedAt').reverse().toArray();
}

export async function getBookById(id: string): Promise<Book | undefined> {
  return await db.books.get(id);
}

export async function saveBook(book: Book): Promise<void> {
  await db.books.put(book);
}

export async function deleteBookCascade(bookId: string): Promise<void> {
  await db.transaction('rw', [db.books, db.chapters, db.cards, db.generationRecords, db.chapterMaterials, db.notes, db.readingSessions], async () => {
    await db.books.delete(bookId);
    await db.chapters.where('bookId').equals(bookId).delete();
    await db.cards.where('bookId').equals(bookId).delete();
    await db.generationRecords.where('bookId').equals(bookId).delete();
    await db.chapterMaterials.where('bookId').equals(bookId).delete();
    await db.notes.where('bookId').equals(bookId).delete();
    await db.readingSessions.where('bookId').equals(bookId).delete();
  });
}

export async function getChaptersForBook(bookId: string): Promise<Chapter[]> {
  return await db.chapters.where('bookId').equals(bookId).sortBy('index');
}

export async function getChapterById(id: string): Promise<Chapter | undefined> {
  return await db.chapters.get(id);
}

export async function saveChapters(chapters: Chapter[]): Promise<void> {
  await db.chapters.bulkPut(chapters);
}

export async function getAllCards(bookId?: string, chapterId?: string): Promise<FlashCard[]> {
  if (chapterId) {
    return await db.cards.where('chapterId').equals(chapterId).toArray();
  }
  if (bookId) {
    return await db.cards.where('bookId').equals(bookId).toArray();
  }
  return await db.cards.toArray();
}

export async function getDueCards(bookId?: string): Promise<FlashCard[]> {
  const now = Date.now();
  const allCards = await getAllCards(bookId);
  return allCards.filter(c => !c.suspended && c.fsrs && c.fsrs.due <= now);
}

export async function saveCards(cards: FlashCard[]): Promise<void> {
  await db.cards.bulkPut(cards);
}

export async function updateCardReview(
  cardId: string,
  nextFsrs: FsrsState,
  rating: 1 | 2 | 3 | 4,
  durationMs: number = 0
): Promise<void> {
  const card = await db.cards.get(cardId);
  if (!card) return;

  card.fsrs = nextFsrs;
  await db.cards.put(card);

  await db.reviewLogs.add({
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    cardId,
    bookId: card.bookId,
    rating,
    reviewedAt: Date.now(),
    durationMs,
  });
}

export async function deleteCard(cardId: string): Promise<void> {
  await db.cards.delete(cardId);
}

export async function getChapterMaterial<T>(chapterId: string, kind: string): Promise<T | null> {
  const item = await db.chapterMaterials.where(['chapterId', 'kind']).equals([chapterId, kind]).first();
  return item ? (item.payload as T) : null;
}

export async function saveChapterMaterial(
  bookId: string,
  chapterId: string,
  kind: 'summary' | 'keyIdeas' | 'lessons' | 'quiz' | 'glossary',
  payload: unknown
): Promise<void> {
  const existing = await db.chapterMaterials.where(['chapterId', 'kind']).equals([chapterId, kind]).first();
  const id = existing?.id || `mat_${chapterId}_${kind}_${Date.now()}`;
  await db.chapterMaterials.put({
    id,
    bookId,
    chapterId,
    kind,
    payload: payload as any,
    createdAt: Date.now(),
  });
}

export async function getGenerationRecord(chapterId: string, kind: string, batch: number = 1): Promise<GenerationRecord | undefined> {
  const records = await db.generationRecords.where(['chapterId', 'kind']).equals([chapterId, kind]).toArray();
  return records.find(r => r.batch === batch);
}

export async function saveGenerationRecord(record: GenerationRecord): Promise<void> {
  await db.generationRecords.put(record);
}

// Reading Habit and Sessions
export async function recordReadingTime(bookId: string, seconds: number, pagesRead: number = 0): Promise<void> {
  if (seconds <= 0) return;
  const today = new Date().toISOString().split('T')[0];
  const existingSession = await db.readingSessions.where({ bookId, date: today }).first();

  if (existingSession) {
    existingSession.seconds += seconds;
    existingSession.pages += pagesRead;
    await db.readingSessions.put(existingSession);
  } else {
    await db.readingSessions.add({
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookId,
      date: today,
      seconds,
      pages: pagesRead,
    });
  }

  // Update streak
  const settings = await getAppSettings();
  if (settings.lastActiveDate !== today) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const newStreak = settings.lastActiveDate === yesterday ? settings.streakDays + 1 : 1;
    await updateAppSettings({
      streakDays: newStreak,
      lastActiveDate: today,
    });
  }
}

export async function getTodayReadingSeconds(): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const sessions = await db.readingSessions.where('date').equals(today).toArray();
  return sessions.reduce((acc, s) => acc + (s.seconds || 0), 0);
}

// Notes
export async function getNotesForBook(bookId: string): Promise<Note[]> {
  return await db.notes.where('bookId').equals(bookId).reverse().sortBy('createdAt');
}

export async function saveNote(note: Note): Promise<void> {
  await db.notes.put(note);
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id);
}

// Full Export and Import
export async function exportAllData(includeKeys: boolean = false): Promise<string> {
  const books = await db.books.toArray();
  const chapters = await db.chapters.toArray();
  const cards = await db.cards.toArray();
  const chapterMaterials = await db.chapterMaterials.toArray();
  const generationRecords = await db.generationRecords.toArray();
  const notes = await db.notes.toArray();
  const readingSessions = await db.readingSessions.toArray();
  let settings = await getAppSettings();

  if (!includeKeys && settings.provider.kind === 'custom') {
    settings = {
      ...settings,
      provider: {
        ...settings.provider,
        apiKey: '', // stripped for security
      },
    };
  }

  const exportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    books,
    chapters,
    cards,
    chapterMaterials,
    generationRecords,
    notes,
    readingSessions,
    settings,
  };

  return JSON.stringify(exportPayload, null, 2);
}

export async function importAllData(jsonString: string): Promise<{ success: boolean; bookCount: number; cardCount: number }> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.books || !Array.isArray(data.books)) {
      throw new Error('Invalid backup file structure: missing books array');
    }

    await db.transaction('rw', [
      db.books,
      db.chapters,
      db.cards,
      db.chapterMaterials,
      db.generationRecords,
      db.notes,
      db.readingSessions,
      db.settings,
    ], async () => {
      if (data.books.length > 0) await db.books.bulkPut(data.books);
      if (data.chapters?.length > 0) await db.chapters.bulkPut(data.chapters);
      if (data.cards?.length > 0) await db.cards.bulkPut(data.cards);
      if (data.chapterMaterials?.length > 0) await db.chapterMaterials.bulkPut(data.chapterMaterials);
      if (data.generationRecords?.length > 0) await db.generationRecords.bulkPut(data.generationRecords);
      if (data.notes?.length > 0) await db.notes.bulkPut(data.notes);
      if (data.readingSessions?.length > 0) await db.readingSessions.bulkPut(data.readingSessions);
      if (data.settings) await db.settings.put(data.settings);
    });

    return {
      success: true,
      bookCount: data.books.length,
      cardCount: data.cards?.length || 0,
    };
  } catch (err: any) {
    throw new Error(err.message || 'Failed to import backup data');
  }
}

export async function clearAllDatabase(): Promise<void> {
  await db.transaction('rw', [
    db.books,
    db.chapters,
    db.cards,
    db.chapterMaterials,
    db.generationRecords,
    db.notes,
    db.readingSessions,
    db.reviewLogs,
    db.dailyMotivations,
    db.settings,
  ], async () => {
    await db.books.clear();
    await db.chapters.clear();
    await db.cards.clear();
    await db.chapterMaterials.clear();
    await db.generationRecords.clear();
    await db.notes.clear();
    await db.readingSessions.clear();
    await db.reviewLogs.clear();
    await db.dailyMotivations.clear();
    await db.settings.put(DEFAULT_SETTINGS);
  });
}
