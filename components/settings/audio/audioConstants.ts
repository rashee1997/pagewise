export interface GeminiVoiceOption {
  id: string;
  name: string;
  gender: string;
  desc: string;
}

export const GEMINI_VOICES: readonly GeminiVoiceOption[] = [
  { id: 'Aoede', name: 'Aoede', gender: 'female', desc: 'Warm, natural, and expressive' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'female', desc: 'Bright, articulate, and clear' },
  { id: 'Kore', name: 'Kore', gender: 'female', desc: 'Calm, steady, and meditative' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male', desc: 'Authoritative, resonant baritone' },
  { id: 'Charon', name: 'Charon', gender: 'male', desc: 'Deep, measured, and reflective' },
  { id: 'Puck', name: 'Puck', gender: 'male', desc: 'Energetic, dynamic, and engaging' },
] as const;
