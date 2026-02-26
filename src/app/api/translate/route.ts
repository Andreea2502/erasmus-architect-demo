/**
 * API Route: Translate text via Gemini
 * =====================================
 * Translates project content to a target language (typically English)
 */

import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent`;

function getApiKeys(): string[] {
    const keys: string[] = [];
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
    const fallback = process.env.GEMINI_API_KEY_FALLBACK;
    if (fallback && fallback.trim() !== '') keys.push(fallback);
    return keys;
}

export async function POST(request: NextRequest) {
    try {
        const { text, targetLanguage = 'en', context } = await request.json() as {
            text: string;
            targetLanguage?: string;
            context?: string;
        };

        if (!text || text.trim() === '') {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const headerApiKey = request.headers.get('x-gemini-api-key');
        const availableKeys = headerApiKey ? [headerApiKey] : getApiKeys();

        if (availableKeys.length === 0) {
            return NextResponse.json({ error: 'Gemini API Key not configured' }, { status: 500 });
        }

        const langNames: Record<string, string> = {
            en: 'English',
            de: 'German',
            fr: 'French',
            es: 'Spanish',
            it: 'Italian',
            ro: 'Romanian',
            hr: 'Croatian',
        };

        const targetLangName = langNames[targetLanguage] || targetLanguage;

        const prompt = `You are a professional translator specializing in EU project proposals (Erasmus+, Horizon Europe, etc.).

TASK: Translate the following text into ${targetLangName}.

RULES:
1. Maintain the EXACT same structure, formatting, and paragraph breaks
2. Keep technical EU terminology accurate (e.g. "Work Package", "Dissemination", "Multiplier Event")
3. Keep proper nouns, organization names, country names, and abbreviations unchanged
4. Maintain bullet points, numbered lists, and headings as-is
5. Use formal, professional language appropriate for an EU funding application
6. Do NOT add any commentary, notes, or explanations
7. Do NOT wrap the output in quotes or code blocks
8. Output ONLY the translated text, nothing else

${context ? `CONTEXT: This text is part of an Erasmus+ ${context} application.\n` : ''}
TEXT TO TRANSLATE:
${text}`;

        const MAX_RETRIES = 2;
        let attempt = 0;
        let currentKeyIdx = 0;
        let data;

        while (attempt < MAX_RETRIES) {
            try {
                const apiKey = availableKeys[currentKeyIdx % availableKeys.length];
                const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 8192,
                        },
                    }),
                });

                if (response.status === 429) {
                    attempt++;
                    if (availableKeys.length > 1) {
                        currentKeyIdx = (currentKeyIdx + 1) % availableKeys.length;
                    }
                    const delay = Math.pow(2, attempt) * 1000;
                    if (attempt >= MAX_RETRIES) throw new Error('API rate limit reached (429). Please wait 1-2 minutes.');
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                data = await response.json();

                if (data.error) {
                    if (data.error.code === 429 || data.error.message?.includes('Resource exhausted')) {
                        attempt++;
                        if (availableKeys.length > 1) {
                            currentKeyIdx = (currentKeyIdx + 1) % availableKeys.length;
                        }
                        if (attempt >= MAX_RETRIES) throw new Error('API rate limit reached (429). Please wait 1-2 minutes.');
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                        continue;
                    }
                    throw new Error(data.error.message);
                }

                break;
            } catch (error: unknown) {
                attempt++;
                if (attempt >= MAX_RETRIES) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (!data) throw new Error('Failed to get response from Gemini');

        const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return NextResponse.json({ translatedText });

    } catch (error) {
        console.error('Translate error:', error);
        return NextResponse.json({
            error: (error as Error).message
        }, { status: 500 });
    }
}
