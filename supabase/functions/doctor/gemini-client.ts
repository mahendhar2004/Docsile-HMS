/**
 * Gemini REST API client for the doctor Edge Function.
 *
 * Why REST (not @google/genai SDK):
 *   - Zero new Deno dependencies — stays compatible with the existing deno.json import map.
 *   - Matches the approach in the old src/lib/ai/gemini.ts exactly.
 *   - Easy to swap model via GEMINI_MODEL env var without code changes.
 *
 * M-5 fix: the old gemini.ts passed the API key as a `?key=` URL query param,
 * which caused it to appear in server access logs and error traces. This file
 * sends it as the `x-goog-api-key` HTTP request header — the documented
 * alternative supported by the Gemini REST API — so the key never appears in
 * a URL. The key is read from Deno.env and is NEVER logged, returned to
 * callers, or included in any error message.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export type GeminiMessage = {
  role: 'user' | 'model';
  text: string;
};

export type GeminiCallOpts = {
  system: string;
  messages: GeminiMessage[];
  maxOutputTokens?: number;
  temperature?: number;
};

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export function callGemini(opts: GeminiCallOpts): Promise<GeminiResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return Promise.resolve({ ok: false, error: 'Gemini API key is not configured.' });
  }

  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash-lite';
  // M-5 fix: key in header, NOT in URL query string.
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent`;

  const body = {
    system_instruction: { parts: [{ text: opts.system }] },
    contents: opts.messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    generationConfig: {
      maxOutputTokens: opts.maxOutputTokens ?? 1024,
      temperature: opts.temperature ?? 0.4,
    },
    // Loose safety thresholds — clinicians discuss conditions, medications,
    // procedures; over-blocking makes the assistant clinically useless.
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // M-5 fix: API key in header, never in the URL.
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })
    .then(async (res) => {
      if (!res.ok) {
        // Read error body for logging but do NOT include apiKey in logs.
        const detail = await res.text().catch(() => '');
        // Log only the status code and a redacted detail — never the key.
        console.error(JSON.stringify({
          level: 'error',
          msg: 'Gemini API error',
          status: res.status,
          detail: detail.slice(0, 300),
        }));
        return { ok: false as const, error: `Gemini request failed (${res.status}).` };
      }

      const json = await res.json() as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
        promptFeedback?: { blockReason?: string };
      };

      if (json.promptFeedback?.blockReason) {
        return { ok: false as const, error: `Request was blocked: ${json.promptFeedback.blockReason}` };
      }

      const parts = json.candidates?.[0]?.content?.parts ?? [];
      const text = parts.map((p) => p.text ?? '').join('').trim();
      if (!text) {
        return { ok: false as const, error: 'No response from model.' };
      }

      return { ok: true as const, text };
    })
    .catch((err: unknown) => {
      // Log the error class/message but never any credential.
      console.error(JSON.stringify({
        level: 'error',
        msg: 'Gemini fetch error',
        error: err instanceof Error ? err.message : String(err),
      }));
      return { ok: false as const, error: 'Could not reach Gemini.' };
    });
}
