const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tryModel(model: string, prompt: string): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      try {
        return JSON.parse(text.replace(/```json|```/g, "").trim());
      } catch {
        lastErr = "invalid JSON: " + text.slice(0, 200);
        continue;
      }
    }
    lastErr = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
    if (res.status === 503) {
      await sleep(1500 * (attempt + 1)); // temporary overload: wait and retry
      continue;
    }
    break; // 404 / 429 / 400: move to the next model right away
  }
  throw new Error(`${model} failed: ${lastErr}`);
}

export async function callGemini(prompt: string): Promise<any> {
  const models = [process.env.GEMINI_MODEL, process.env.GEMINI_FALLBACK_MODEL].filter(Boolean) as string[];
  if (models.length === 0) throw new Error("No GEMINI_MODEL set");
  let lastError: any;
  for (const m of models) {
    try {
      return await tryModel(m, prompt);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}
