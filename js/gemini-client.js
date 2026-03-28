import { getAiCacheEntry, setAiCacheEntry } from './storage.js';

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calls Gemini REST from the browser. May fail due to CORS or invalid key.
 * Returns parsed JSON or throws.
 */
export async function callGeminiJson(systemInstruction, userPrompt, apiKey, model) {
  if (!apiKey) throw new Error('No API key');

  const hash = await sha256Hex(systemInstruction + userPrompt);
  const cached = getAiCacheEntry(hash);
  if (cached) return JSON.parse(cached);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!res.ok) {
    let errText;
    try {
      errText = JSON.stringify(await res.json());
    } catch {
      errText = await res.text();
    }
    throw new Error(`Gemini ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  }

  setAiCacheEntry(hash, JSON.stringify(parsed));
  return parsed;
}
