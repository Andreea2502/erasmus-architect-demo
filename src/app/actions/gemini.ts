
'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// API KEY MANAGEMENT — Supports fallback key for rate limit resilience
// ============================================================================

function getApiKeys(): string[] {
    const keys: string[] = [];
    const primary = process.env.GEMINI_API_KEY;
    const fallback = process.env.GEMINI_API_KEY_FALLBACK;
    if (primary) keys.push(primary);
    if (fallback && fallback.trim() !== '') keys.push(fallback);
    return keys;
}

// Track which key to use — prefer the one that last succeeded
let preferredKeyIndex = 0;

// Track rate-limit state per key: timestamp when 429 was last seen
const keyRateLimitedAt: Map<number, number> = new Map();

function getModelName(): string {
    return process.env.GEMINI_MODEL || 'gemini-2.0-flash';
}

/**
 * Get the best key index to start with.
 * Prefers the key that most recently succeeded (preferredKeyIndex).
 * If that key was rate-limited recently (within 30s), try the other one first.
 */
function getBestKeyIndex(keys: string[]): number {
    if (keys.length <= 1) return 0;
    const now = Date.now();
    const preferredLimitedAt = keyRateLimitedAt.get(preferredKeyIndex) || 0;
    // If preferred key was rate-limited within last 30s, try the other
    if (now - preferredLimitedAt < 30000) {
        const altIndex = (preferredKeyIndex + 1) % keys.length;
        const altLimitedAt = keyRateLimitedAt.get(altIndex) || 0;
        // Only switch if the alternative wasn't ALSO rate-limited recently
        if (now - altLimitedAt > 30000) {
            return altIndex;
        }
    }
    return preferredKeyIndex % keys.length;
}

// ============================================================================
// REUSABLE RETRY WRAPPER with Key Rotation
// ============================================================================

/**
 * Retry wrapper with API key rotation on rate limits.
 * Smart features:
 * - Remembers which key last succeeded (uses that one first)
 * - On 429: tries the next API key immediately (if available)
 * - If ALL keys are 429'd: fails FAST with clear message (no long waits)
 * - For non-429 errors: exponential backoff
 */
async function withRetry<T>(
    fn: (apiKey: string) => Promise<T>,
    taskName: string = 'AI Task',
    maxRetries: number = 3
): Promise<T> {
    const keys = getApiKeys();
    if (keys.length === 0) throw new Error('No GEMINI_API_KEY configured');

    let attempt = 0;
    let keyIndex = getBestKeyIndex(keys);
    const rateLimitedKeys = new Set<number>(); // Track which keys got 429 in THIS call

    while (attempt < maxRetries) {
        try {
            const result = await fn(keys[keyIndex]);
            // Success! Remember this key as preferred
            preferredKeyIndex = keyIndex;
            keyRateLimitedAt.delete(keyIndex);
            return result;
        } catch (error: any) {
            attempt++;
            const isRateLimited =
                error.message?.includes('429') ||
                error.message?.includes('Resource exhausted');
            const isRetryable = isRateLimited ||
                error.message?.includes('503') ||
                error.message?.includes('504');

            if (!isRetryable || attempt >= maxRetries) {
                console.error(`[Gemini] ${taskName} failed permanently after ${attempt} attempts:`, error.message);
                throw error;
            }

            if (isRateLimited) {
                // Mark this key as rate-limited
                rateLimitedKeys.add(keyIndex);
                keyRateLimitedAt.set(keyIndex, Date.now());

                // If ALL keys are rate-limited in this call: fail fast
                if (rateLimitedKeys.size >= keys.length) {
                    console.error(`[Gemini] ${taskName}: ALL ${keys.length} API key(s) are rate-limited (429). Failing fast.`);
                    console.error(`[Gemini] LAST ERROR:`, error.message);
                    throw new Error(
                        `API-Rate-Limit erreicht (429). Alle ${keys.length} API-Keys sind temporär gesperrt. ` +
                        `Bitte warte 1-2 Minuten und versuche es erneut. ` +
                        `(Gemini Free-Tier: max 10 Requests/Minute, 250 Requests/Tag)`
                    );
                }

                // Try the next key (it hasn't been rate-limited yet in this call)
                if (keys.length > 1) {
                    const prevIndex = keyIndex;
                    keyIndex = (keyIndex + 1) % keys.length;
                    console.warn(`[Gemini] ${taskName} rate limited on key ${prevIndex + 1}/${keys.length}. Switching to key ${keyIndex + 1}. Attempt ${attempt}/${maxRetries}`);
                    // Short delay when switching keys
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    // Only 1 key: short backoff then retry
                    const delay = 3000 + (Math.random() * 2000);
                    console.warn(`[Gemini] ${taskName} rate limited. Retrying in ${Math.round(delay)}ms. Attempt ${attempt}/${maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } else {
                // Non-rate-limit error: exponential backoff
                const delay = Math.pow(2, attempt) * 1000 + (Math.random() * 1000);
                console.warn(`[Gemini] ${taskName} error. Attempt ${attempt}/${maxRetries}. Retrying in ${Math.round(delay)}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw new Error(`${taskName} failed after ${maxRetries} retries`);
}

// ============================================================================
// EXPORTED API FUNCTIONS
// ============================================================================

export async function generateContentAction(
    prompt: string,
    systemContext?: string,
    temperature: number = 0.7,
    timeoutMs: number = 60000
): Promise<string> {
    return withRetry(async (apiKey) => {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: getModelName(),
            generationConfig: { temperature, maxOutputTokens: 8192 },
            systemInstruction: systemContext
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('AI request timeout after ' + (timeoutMs / 1000) + 's')), timeoutMs)
        );

        const result = await Promise.race([
            model.generateContent(prompt),
            timeoutPromise
        ]);

        const response = await result.response;
        const text = response.text();

        console.log('[Gemini] Response length:', text.length);
        console.log('[Gemini] Response preview:', text.substring(0, 300));

        return text;
    }, 'Generate Content');
}

/**
 * Generate JSON content with special handling for structured output
 */
export async function generateJsonContentAction(
    prompt: string,
    systemContext?: string,
    temperature: number = 0.5
): Promise<string> {
    return withRetry(async (apiKey) => {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: getModelName(),
            generationConfig: {
                temperature,
                maxOutputTokens: 8192,
                responseMimeType: "application/json"
            },
            systemInstruction: systemContext
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('[Gemini JSON] Response length:', text.length);
        console.log('[Gemini JSON] Response preview:', text.substring(0, 500));

        return text;
    }, 'Generate JSON Content');
}

export async function getEmbeddingAction(text: string): Promise<number[]> {
    return withRetry(async (apiKey) => {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        return result.embedding.values;
    }, 'Get Embedding', 2).catch(() => []); // 2 retries only (embeddings are optional)
}

export async function analyzeImageAction(
    imageBase64: string,
    prompt?: string
): Promise<string> {
    return withRetry(async (apiKey) => {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: getModelName() });

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const defaultPrompt = `Extrahiere den gesamten Text aus diesem Bild/Dokument. Gib nur den extrahierten Text zurück.`;

        const result = await model.generateContent([
            { text: prompt || defaultPrompt },
            { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
        ]);

        return result.response.text();
    }, 'Analyze Image');
}

export async function extractTextFromImageAction(imageBase64: string) {
    return analyzeImageAction(imageBase64);
}
