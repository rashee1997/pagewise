import { db } from '../db';

export interface DayReadingSummary {
  date: string; // YYYY-MM-DD
  dayLabel: string; // Mon, Tue...
  minutes: number;
  metGoal: boolean;
}

export async function getLast7DaysActivity(goalMinutes: number = 20): Promise<DayReadingSummary[]> {
  const result: DayReadingSummary[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = dayNames[d.getDay()];

    const sessions = await db.readingSessions.where('date').equals(dateStr).toArray();
    const totalSeconds = sessions.reduce((acc, s) => acc + (s.seconds || 0), 0);
    const minutes = Math.round(totalSeconds / 60);

    result.push({
      date: dateStr,
      dayLabel,
      minutes,
      metGoal: minutes >= goalMinutes,
    });
  }

  return result;
}
