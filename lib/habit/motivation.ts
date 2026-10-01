import { db } from '../db';
import { DailyMotivation, AppSettings } from '../db/types';

const FALLBACK_MOTIVATIONS = [
  { text: 'A reader lives a thousand lives before he dies. The man who never reads lives only one.', author: 'George R.R. Martin' },
  { text: 'Reading is to the mind what exercise is to the body.', author: 'Joseph Addison' },
  { text: 'The more that you read, the more things you will know. The more that you learn, the more places you will go.', author: 'Dr. Seuss' },
  { text: 'Think before you speak. Read before you think.', author: 'Fran Lebowitz' },
  { text: 'In the case of good books, the point is not to see how many of them you can get through, but rather how many can get through to you.', author: 'Mortimer J. Adler' },
  { text: 'Today a reader, tomorrow a leader.', author: 'Margaret Fuller' },
  { text: 'A room without books is like a body without a soul.', author: 'Marcus Tullius Cicero' },
];

export async function getDailyMotivation(settings: AppSettings): Promise<{ text: string; author: string }> {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Check IndexedDB cache first
    const cached = await db.dailyMotivations.where('date').equals(today).first();
    if (cached) {
      return { text: cached.text, author: cached.author || 'Literary Wisdom' };
    }

    // Try fetching fresh motivation from model
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'motivation',
        chapterText: '',
        provider: settings.provider,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.text) {
        const item: DailyMotivation = {
          date: today,
          text: json.data.text,
          author: json.data.author || 'Literary Wisdom',
          hash: `mot_${today}`,
        };
        await db.dailyMotivations.put(item);
        return { text: item.text, author: item.author! };
      }
    }
  } catch (e) {
    console.warn('Could not generate dynamic motivation, using offline rotation', e);
  }

  // Fallback based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const fallback = FALLBACK_MOTIVATIONS[Math.abs(dayOfYear) % FALLBACK_MOTIVATIONS.length];
  return fallback;
}
