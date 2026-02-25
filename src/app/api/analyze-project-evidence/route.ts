import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent`;

function getApiKeys(): string[] {
    const keys: string[] = [];
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
    const fb = process.env.GEMINI_API_KEY_FALLBACK;
    if (fb && fb.trim() !== '') keys.push(fb);
    return keys;
}

export async function POST(request: NextRequest) {
    try {
        const { content, url, language = 'de' } = await request.json();

        let textToAnalyze = content;

        if (url) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

                const fetchRes = await fetch(url, {
                    signal: controller.signal,
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ErasmusBot/1.0)' }
                });
                clearTimeout(timeout);

                if (!fetchRes.ok) throw new Error(`Failed to fetch URL: ${fetchRes.status}`);

                const html = await fetchRes.text();

                // Simple HTML to Text extraction
                textToAnalyze = html
                    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
                    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
                    .replace(/<[^>]+>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
                    .substring(0, 30000); // Limit size

            } catch (e) {
                return NextResponse.json({ error: `Could not fetch URL: ${(e as Error).message}` }, { status: 400 });
            }
        }

        if (!textToAnalyze) {
            return NextResponse.json({ error: 'Content or URL is required' }, { status: 400 });
        }

        // API Key aus Header oder Environment (mit Fallback-Support)
        const headerApiKey = request.headers.get('x-gemini-api-key');
        const availableKeys = headerApiKey ? [headerApiKey] : getApiKeys();
        const apiKey = availableKeys[0];

        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API Key nicht konfiguriert' }, { status: 500 });
        }

        const langInstructions: Record<string, string> = {
            de: 'Antworte auf Deutsch.',
            en: 'Respond in English.',
        };

        const prompt = `Du bist ein Experte für EU-Projekte (Erasmus+, Horizon). 
Analysiere den folgenden Text, der ein vergangenes Projekt beschreibt. Extrahiere die Projektdaten und erstelle eine spannende, überzeugende Zusammenfassung.

TEXT:
"${textToAnalyze.substring(0, 30000)}"

AUFGABE:
1. Extrahiere Titel, Jahr (ungefähr), Programm (z.B. Erasmus+ KA2) und Rolle (Koordinator oder Partner).
2. Schreibe eine "Action-Oriented" Zusammenfassung als Bullet-Points.
   - Fokus auf: Zielgruppen, Konkrete Ergebnisse, Impact, Innovation.
   - Nutze starke Verben und "Erasmus-Speak" (z.B. "fostering", "empowering", "sustainable").
   - Format: Markdown Bullet Points.

${langInstructions[language] || langInstructions.de}

Antworte NUR als valides JSON:
{
  "title": "Projekttitel (wenn nicht gefunden: 'Unbekanntes Projekt')",
  "year": 2023,
  "programme": "ERASMUS_KA2 (oder: ERASMUS_KA1, HORIZON, OTHER)",
  "role": "PARTNER (oder: COORDINATOR)",
  "description": "Markant formulierte Bullet-Points (Markdown)..."
}`;

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 2048,
                },
            }),
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('No response from AI');

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Invalid JSON format');

        const result = JSON.parse(jsonMatch[0]);

        return NextResponse.json(result);

    } catch (error) {
        console.error('Project Analysis Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
