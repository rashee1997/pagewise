import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { validateBaseUrl } from '@/lib/ai/guards';

const testGenAi = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' },
  },
});

export async function POST(req: NextRequest) {
  try {
    const { kind, baseURL, apiKey, model, fallbackModel } = await req.json();

    // 1. Test Default Gemini Provider
    if (kind === 'default') {
      const primary = model || 'gemini-3.8-flash';
      const fallback = fallbackModel || 'gemini-3.1-flash-lite';

      try {
        const primaryRes = await testGenAi.models.generateContent({
          model: primary,
          contents: 'Say "connected" in one word.',
        });
        const primaryReply = primaryRes.text?.trim() || 'OK';

        let fallbackMsg = '';
        if (fallback && fallback !== primary) {
          try {
            const fallbackRes = await testGenAi.models.generateContent({
              model: fallback,
              contents: 'Say "connected" in one word.',
            });
            fallbackMsg = ` Fallback (${fallback}) verified: "${fallbackRes.text?.trim() || 'OK'}".`;
          } catch (fErr: any) {
            fallbackMsg = ` (Note: Fallback ${fallback} check returned: ${fErr?.message || 'warning'}).`;
          }
        }

        return NextResponse.json({
          ok: true,
          message: `Primary (${primary}) connected successfully! Response: "${primaryReply}".${fallbackMsg}`,
        });
      } catch (err: any) {
        // If primary failed, test fallback
        if (fallback && fallback !== primary) {
          try {
            const fbRes = await testGenAi.models.generateContent({
              model: fallback,
              contents: 'Say "connected" in one word.',
            });
            return NextResponse.json({
              ok: true,
              message: `Notice: Primary model (${primary}) is busy, but fallback (${fallback}) responded: "${fbRes.text?.trim()}". Automatic failover is active.`,
            });
          } catch (fbErr: any) {
            return NextResponse.json({
              ok: false,
              error: `Gemini error: ${err.message || 'Unable to connect'}. Fallback also failed: ${fbErr.message}`,
            }, { status: 500 });
          }
        }
        return NextResponse.json({
          ok: false,
          error: `Gemini API error: ${err.message || 'Unable to connect to Google Gemini'}`,
        }, { status: 500 });
      }
    }

    // 2. Test Custom OpenAI-compatible Provider
    if (!baseURL || !model) {
      return NextResponse.json(
        { ok: false, error: 'Base URL and Model Name are required.' },
        { status: 400 }
      );
    }

    const urlCheck = validateBaseUrl(baseURL);
    if (!urlCheck.valid) {
      return NextResponse.json({ ok: false, error: urlCheck.error }, { status: 400 });
    }

    const endpoint = `${baseURL.replace(/\/+$/, '')}/chat/completions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: model.trim(),
          messages: [{ role: 'user', content: 'Say "connected" in one word.' }],
          max_tokens: 10,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return NextResponse.json(
            { ok: false, error: 'Authentication failed. Please verify your API key.' },
            { status: 401 }
          );
        }
        if (response.status === 404) {
          return NextResponse.json(
            { ok: false, error: `Model "${model}" was not found at this endpoint (404). Check the model name.` },
            { status: 404 }
          );
        }
        const errText = await response.text();
        return NextResponse.json(
          { ok: false, error: `Endpoint returned error ${response.status}: ${errText.slice(0, 150)}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'ok';

      let fallbackInfo = '';
      if (fallbackModel && fallbackModel.trim() !== model.trim()) {
        try {
          const fbResponse = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: fallbackModel.trim(),
              messages: [{ role: 'user', content: 'Say "connected" in one word.' }],
              max_tokens: 10,
            }),
          });
          if (fbResponse.ok) {
            fallbackInfo = ` Fallback model (${fallbackModel}) is also verified!`;
          } else {
            fallbackInfo = ` (Note: Fallback model ${fallbackModel} returned status ${fbResponse.status})`;
          }
        } catch {
          fallbackInfo = ` (Note: could not verify fallback model ${fallbackModel})`;
        }
      }

      return NextResponse.json({
        ok: true,
        message: `Successfully connected to default model "${model}"! Response: "${reply.trim()}".${fallbackInfo}`,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json(
          { ok: false, error: 'Connection timed out after 12 seconds. Ensure the server is online.' },
          { status: 408 }
        );
      }
      return NextResponse.json(
        { ok: false, error: `Network error: ${fetchErr.message || 'Cannot reach endpoint'}` },
        { status: 502 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || 'Unexpected server error' },
      { status: 500 }
    );
  }
}
