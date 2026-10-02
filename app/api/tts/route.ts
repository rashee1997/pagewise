import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const VALID_GEMINI_VOICES = ['Aoede', 'Zephyr', 'Kore', 'Fenrir', 'Charon', 'Puck'];

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'Aoede', model = 'gemini-3.8-flash-tts' } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text prompt is required.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured on the server.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Ensure valid Gemini TTS model alias
    const safeModel =
      model === 'gemini-3.8-flash-lite-tts' ? 'gemini-3.8-flash-lite-tts' : 'gemini-3.8-flash-tts';

    // Ensure valid Gemini voice name (map Kokoro voice IDs if passed)
    let safeVoice = voice;
    if (!VALID_GEMINI_VOICES.includes(safeVoice)) {
      if (safeVoice?.startsWith('am_') || safeVoice?.includes('adam') || safeVoice?.includes('michael') || safeVoice?.includes('george')) {
        safeVoice = 'Fenrir';
      } else {
        safeVoice = 'Aoede';
      }
    }

    // Call Gemini with AUDIO response modality and prebuilt voice
    const response = await ai.models.generateContent({
      model: safeModel,
      contents: text,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: safeVoice,
            },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    const audioData = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType || 'audio/mp3';

    if (!audioData) {
      throw new Error('No audio data returned by Gemini TTS model.');
    }

    return NextResponse.json({
      audio: audioData,
      mimeType,
      voice: safeVoice,
      model: safeModel,
    });
  } catch (error: any) {
    console.error('Error generating Gemini TTS audio:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to synthesize speech with Gemini TTS.' },
      { status: 500 }
    );
  }
}
