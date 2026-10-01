import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { GenerateApiRequest } from '@/lib/ai/types';
import { validateBaseUrl, checkRateLimit } from '@/lib/ai/guards';

const defaultAi = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function sanitizeGeminiModelName(modelName?: string): string {
  if (!modelName) return 'gemini-3.8-flash';
  let cleaned = modelName.trim();
  cleaned = cleaned.replace(/^models\//, '');
  if (cleaned.startsWith('AIza') || !cleaned.toLowerCase().includes('gemini')) {
    return 'gemini-3.8-flash';
  }
  return cleaned;
}

function getValidGeminiModel(): string {
  const envModel = process.env.GEMINI_MODEL?.trim();
  if (
    envModel &&
    !envModel.startsWith('AIza') &&
    envModel.toLowerCase().includes('gemini')
  ) {
    return envModel.replace(/^models\//, '');
  }
  return 'gemini-3.8-flash';
}

const DEFAULT_FALLBACK_MODEL = 'gemini-3.1-flash-lite';

async function callGeminiWithFallback(
  prompt: string,
  config: any,
  primaryModel: string,
  fallbackModel: string
) {
  try {
    const res = await defaultAi.models.generateContent({
      model: primaryModel,
      contents: prompt,
      config,
    });
    return { result: res, modelUsed: primaryModel, usedFallback: false };
  } catch (err: any) {
    console.warn(`[Pagewise Gemini] Primary model "${primaryModel}" failed (${err?.message || err}). Trying fallback "${fallbackModel}"...`);
    if (fallbackModel && fallbackModel !== primaryModel) {
      try {
        const fallbackRes = await defaultAi.models.generateContent({
          model: fallbackModel,
          contents: prompt,
          config,
        });
        return { result: fallbackRes, modelUsed: fallbackModel, usedFallback: true };
      } catch (fallbackErr: any) {
        console.warn(`[Pagewise Gemini] Fallback model "${fallbackModel}" failed (${fallbackErr?.message || fallbackErr}). Trying ultimate fallback "${DEFAULT_FALLBACK_MODEL}"...`);
        if (fallbackModel !== DEFAULT_FALLBACK_MODEL && primaryModel !== DEFAULT_FALLBACK_MODEL) {
          const finalRes = await defaultAi.models.generateContent({
            model: DEFAULT_FALLBACK_MODEL,
            contents: prompt,
            config,
          });
          return { result: finalRes, modelUsed: DEFAULT_FALLBACK_MODEL, usedFallback: true };
        }
        throw fallbackErr;
      }
    }

    if (primaryModel !== DEFAULT_FALLBACK_MODEL) {
      const finalRes = await defaultAi.models.generateContent({
        model: DEFAULT_FALLBACK_MODEL,
        contents: prompt,
        config,
      });
      return { result: finalRes, modelUsed: DEFAULT_FALLBACK_MODEL, usedFallback: true };
    }
    throw err;
  }
}

// Helper to extract clean JSON string if wrapped in markdown code fence
function extractJsonString(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateApiRequest = await req.json();
    const {
      kind,
      chapterText,
      bookTitle,
      author,
      chapterTitle,
      selectedText,
      existingConceptKeys = [],
      userPrompt,
      chatHistory = [],
      provider,
      batch = 1,
    } = body;

    // Security & Rate Limiting Check
    const isCustom = provider && provider.kind === 'custom' && provider.apiKey && provider.baseURL && provider.model;

    if (!isCustom) {
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
      const { allowed } = checkRateLimit(clientIp);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Rate limit reached for the default AI model. Please wait a minute or connect your own API key in Settings.' },
          { status: 429 }
        );
      }
    } else {
      const urlCheck = validateBaseUrl(provider.baseURL!);
      if (!urlCheck.valid) {
        return NextResponse.json({ error: urlCheck.error || 'Invalid custom baseURL' }, { status: 400 });
      }
    }

    // Truncate chapter text if too large to avoid runaway prompts
    const safeChapterText = (chapterText || '').slice(0, 35000);

    // Build system instructions and user prompts based on kind
    let systemInstruction = `You are Pagewise, a master educator and study companion for books. You extract high-yield, crystal-clear study materials with zero filler.`;
    let prompt = '';
    let responseMimeType: string | undefined = undefined;

    if (kind === 'summary') {
      responseMimeType = 'application/json';
      systemInstruction += ` Produce a structured chapter summary in valid JSON. Output strictly JSON with keys: "headline" (string), "overview" (2-3 paragraphs string), "takeaways" (array of 4-6 high impact bullet points), "outline" (array of objects with "title" and "summary").`;
      prompt = `Book: "${bookTitle || 'Untitled'}" by ${author || 'Unknown'}\nChapter: "${chapterTitle || 'Chapter'}"\n\nChapter Content:\n${safeChapterText}\n\nProvide the comprehensive executive summary in the specified JSON format.`;
    } else if (kind === 'keyIdeas') {
      responseMimeType = 'application/json';
      systemInstruction += ` Extract the core mental models and big ideas. Output strictly a JSON array of objects with keys: "title" (string), "explanation" (rich string), "quote" (optional exact quote from text), "actionableInsight" (how to apply this concept).`;
      prompt = `Book: "${bookTitle || 'Untitled'}"\nChapter: "${chapterTitle || 'Chapter'}"\n\nChapter Content:\n${safeChapterText}\n\nExtract 4-7 primary key ideas and concepts in JSON array format.`;
    } else if (kind === 'cards') {
      responseMimeType = 'application/json';
      const existingKeyNotice = existingConceptKeys.length > 0
        ? `IMPORTANT: The user already has flashcards covering these concepts: [${existingConceptKeys.join(', ')}]. DO NOT repeat them. Focus on NEW concepts, deep nuances, edge cases, and practical recall.`
        : '';
      systemInstruction += ` You generate high-yield spaced repetition flashcards. Output strictly a JSON array of objects with keys:
- "type": "basic" | "concept" | "cloze"
- "front": Clear question or active recall prompt
- "back": Concise, memorable answer with key reasoning
- "hint": (optional helpful mnemonic or hint)
- "conceptKey": short hyphenated slug (e.g., "moral-law-definition", "flank-maneuver")
${existingKeyNotice}`;
      prompt = `Book: "${bookTitle || 'Untitled'}"\nChapter: "${chapterTitle || 'Chapter'}"\nBatch: ${batch}\n\nChapter Content:\n${safeChapterText}\n\nGenerate 6-10 high quality flashcards in the specified JSON array format.`;
    } else if (kind === 'quiz') {
      responseMimeType = 'application/json';
      systemInstruction += ` Generate an interactive multiple-choice test to assess deep understanding of this chapter. Output strictly a JSON array of 5 questions with keys:
- "question": string
- "options": array of 4 distinct choices
- "correctAnswerIndex": integer (0 to 3)
- "explanation": why this option is correct and why other choices are wrong.`;
      prompt = `Book: "${bookTitle || 'Untitled'}"\nChapter: "${chapterTitle || 'Chapter'}"\n\nChapter Content:\n${safeChapterText}\n\nCreate a 5-question multiple choice quiz in JSON format.`;
    } else if (kind === 'glossary') {
      responseMimeType = 'application/json';
      systemInstruction += ` Extract key domain terminology, archaic words, or specialized concepts from this chapter. Output strictly a JSON array of objects with keys:
- "term": string
- "definition": clear explanation in modern terms
- "contextUsage": how it was used in this chapter.`;
      prompt = `Book: "${bookTitle || 'Untitled'}"\nChapter: "${chapterTitle || 'Chapter'}"\n\nChapter Content:\n${safeChapterText}\n\nExtract 5-10 key vocabulary/domain terms in JSON format.`;
    } else if (kind === 'lessons') {
      responseMimeType = 'application/json';
      systemInstruction += ` Extract structured core lessons and practical takeaways from this chapter. Output strictly a JSON array of objects with keys:
- "title": concise title of the lesson
- "corePrinciple": the fundamental principle taught
- "context": why this lesson matters in the chapter context
- "actionableStep": how the reader can apply this lesson in life or work`;
      prompt = `Book: "${bookTitle || 'Untitled'}"\nChapter: "${chapterTitle || 'Chapter'}"\n\nChapter Content:\n${safeChapterText}\n\nExtract 4-8 core structured lessons from this chapter in JSON array format.`;
    } else if (kind === 'explain_selection') {
      systemInstruction += ` You explain complex passages clearly. Be direct, insightful, and accessible. Use markdown formatting.`;
      prompt = `In the book "${bookTitle || 'Book'}" (${chapterTitle || ''}), the reader highlighted this passage:\n\n> "${selectedText}"\n\nContext around it in chapter:\n${safeChapterText.slice(0, 3000)}\n\nExplain what this passage means, its significance, and underlying implications in 2-3 clear paragraphs.`;
    } else if (kind === 'simplify_selection') {
      systemInstruction += ` Rewrite difficult, convoluted, or archaic book passages into crystal-clear plain English that a 12-year-old could easily grasp, while preserving deep meaning.`;
      prompt = `Simplify this passage from "${bookTitle || 'Book'}":\n\n> "${selectedText}"\n\nProvide:
1. One-sentence plain English summary
2. Plain language breakdown
3. A real-world analogy`;
    } else if (kind === 'chat_assistant') {
      systemInstruction += ` You are the Pagewise Reading Assistant. You are reading alongside the user. You have full context of the active book, chapter, and any highlighted text. Answer queries concisely and thoughtfully using markdown formatting. When the user asks for a quiz question, include a JSON object block with keys "question", "options" (array of 4 choices), "correctAnswerIndex" (0-3), and "explanation".`;
      const contextPill = `Current Book: "${bookTitle || 'Unknown'}" by ${author || 'Unknown'}\nActive Chapter: "${chapterTitle || 'Current'}"\n${selectedText ? `User Highlighted Text: "${selectedText}"\n` : ''}`;
      const historyFormatted = chatHistory
        .map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
        .join('\n');
      prompt = `${contextPill}\nChapter Excerpt:\n${safeChapterText.slice(0, 8000)}\n\nConversation History:\n${historyFormatted}\n\nUser Question: ${userPrompt || 'What are the main insights of this chapter?'}`;
    } else if (kind === 'motivation') {
      responseMimeType = 'application/json';
      systemInstruction += ` Provide an uplifting, thoughtful reading quote from literature, philosophy, or history, accompanied by a 1-sentence reflection on the power of daily reading and lifelong learning. Output strictly JSON with keys: "text" (the quote), "author" (name of speaker/writer), "reflection" (1 sentence).`;
      prompt = `Give a daily motivation for an avid reader today.`;
    }

    // Call Model: Either Custom OpenAI-compatible or Default Gemini
    if (isCustom) {
      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemInstruction },
      ];
      if (chatHistory.length > 0 && kind === 'chat_assistant') {
        for (const msg of chatHistory) {
          messages.push({
            role: msg.role === 'model' ? 'assistant' : msg.role,
            content: msg.text,
          });
        }
      }
      messages.push({ role: 'user', content: prompt });

      const customEndpoint = `${provider.baseURL!.replace(/\/+$/, '')}/chat/completions`;

      const sendCustomRequest = async (modelToUse: string) => {
        return fetch(customEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: modelToUse,
            messages,
            temperature: 0.3,
            ...(responseMimeType === 'application/json' ? { response_format: { type: 'json_object' } } : {}),
          }),
        });
      };

      let response = await sendCustomRequest(provider.model!);
      let modelUsed = provider.model!;
      let fallbackUsed = false;

      // If primary model failed and fallback model is configured, retry with fallback
      if (!response.ok && provider.fallbackModel && provider.fallbackModel !== provider.model) {
        console.warn(`[Pagewise Custom] Primary model "${provider.model}" failed (${response.status}). Retrying with fallback model "${provider.fallbackModel}"...`);
        try {
          const fallbackRes = await sendCustomRequest(provider.fallbackModel);
          if (fallbackRes.ok) {
            response = fallbackRes;
            modelUsed = provider.fallbackModel;
            fallbackUsed = true;
          }
        } catch (fallbackErr) {
          console.error('[Pagewise Custom] Fallback model request error:', fallbackErr);
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `Custom provider error (${response.status}): ${errorText.slice(0, 300)}` },
          { status: response.status }
        );
      }

      const resData = await response.json();
      const rawText = resData.choices?.[0]?.message?.content || '';

      if (responseMimeType === 'application/json') {
        try {
          const parsed = JSON.parse(extractJsonString(rawText));
          return NextResponse.json({ data: parsed, rawText, modelUsed, fallbackUsed });
        } catch (jsonErr) {
          return NextResponse.json({ data: null, rawText, parseError: true, modelUsed, fallbackUsed });
        }
      }

      return NextResponse.json({ text: rawText, modelUsed, fallbackUsed });
    }

    // Default: Server-Side Gemini API with automatic fallback
    const geminiConfig: any = {
      systemInstruction,
      temperature: 0.3,
    };

    if (responseMimeType) {
      geminiConfig.responseMimeType = responseMimeType;
    }

    const primaryGeminiModel = provider?.model ? sanitizeGeminiModelName(provider.model) : getValidGeminiModel();
    const fallbackGeminiModel = provider?.fallbackModel ? sanitizeGeminiModelName(provider.fallbackModel) : DEFAULT_FALLBACK_MODEL;

    const { result, modelUsed, usedFallback } = await callGeminiWithFallback(
      prompt,
      geminiConfig,
      primaryGeminiModel,
      fallbackGeminiModel
    );

    const rawText = result.text || '';

    if (responseMimeType === 'application/json') {
      try {
        const parsed = JSON.parse(extractJsonString(rawText));
        return NextResponse.json({ data: parsed, rawText, modelUsed, fallbackUsed: usedFallback });
      } catch (jsonErr) {
        return NextResponse.json({ data: null, rawText, parseError: true, modelUsed, fallbackUsed: usedFallback });
      }
    }

    return NextResponse.json({ text: rawText, modelUsed, fallbackUsed: usedFallback });
  } catch (error: any) {
    console.error('Error in /api/generate:', error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred while generating study content.' },
      { status: 500 }
    );
  }
}
