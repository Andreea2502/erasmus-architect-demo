/**
 * API Route: KI-gestützte Sektionsverbesserung
 * =============================================
 * Verbessert einen bestimmten Abschnitt des Projektantrags
 * basierend auf Evaluator-Feedback oder Benutzeranweisungen
 */

import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent`;

/** Get available API keys (primary + optional fallback) */
function getApiKeys(): string[] {
    const keys: string[] = [];
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
    const fallback = process.env.GEMINI_API_KEY_FALLBACK;
    if (fallback && fallback.trim() !== '') keys.push(fallback);
    return keys;
}

export async function POST(request: NextRequest) {
  try {
    const {
      sectionType,
      currentContent,
      instruction,
      evaluatorFeedback,
      projectContext,
      language = 'de'
    } = await request.json() as {
      sectionType: string;
      currentContent: unknown;
      instruction?: string;
      evaluatorFeedback?: {
        weaknesses?: string[];
        suggestions?: string[];
        criticalIssues?: string[];
      };
      projectContext?: {
        projectTitle?: string;
        acronym?: string;
        sector?: string;
        targetGroups?: string[];
        objectives?: string;
      };
      language: string;
    };

    if (!currentContent) {
      return NextResponse.json({
        error: 'Aktueller Inhalt erforderlich'
      }, { status: 400 });
    }

    // API Keys: Header > Environment (primary + fallback)
    const headerApiKey = request.headers.get('x-gemini-api-key');
    const availableKeys = headerApiKey ? [headerApiKey] : getApiKeys();

    if (availableKeys.length === 0) {
      return NextResponse.json({
        error: 'Gemini API Key nicht konfiguriert'
      }, { status: 500 });
    }

    // Use first available key (will try fallback on 429)
    let apiKey = availableKeys[0];

    const langInstructions: Record<string, string> = {
      de: 'Antworte auf Deutsch. Verwende formellen, professionellen Stil.',
      en: 'Respond in English. Use formal, professional style.',
      es: 'Responde en español. Usa estilo formal y profesional.',
      fr: 'Réponds en français. Utilise un style formel et professionnel.',
      it: 'Rispondi in italiano. Usa uno stile formale e professionale.',
    };

    // Build improvement instruction
    let improvementGuide = '';

    if (evaluatorFeedback) {
      improvementGuide += '\n\nEVALUATOR-FEEDBACK ZUM VERBESSERN:\n';

      if (evaluatorFeedback.weaknesses?.length) {
        improvementGuide += '\nIDENTIFIZIERTE SCHWÄCHEN:\n';
        evaluatorFeedback.weaknesses.forEach((w, i) => {
          improvementGuide += `${i + 1}. ${w}\n`;
        });
      }

      if (evaluatorFeedback.suggestions?.length) {
        improvementGuide += '\nVERBESSERUNGSVORSCHLÄGE:\n';
        evaluatorFeedback.suggestions.forEach((s, i) => {
          improvementGuide += `${i + 1}. ${s}\n`;
        });
      }

      if (evaluatorFeedback.criticalIssues?.length) {
        improvementGuide += '\nKRITISCHE PROBLEME (MÜSSEN BEHOBEN WERDEN):\n';
        evaluatorFeedback.criticalIssues.forEach((c, i) => {
          improvementGuide += `${i + 1}. ${c}\n`;
        });
      }
    }

    if (instruction) {
      improvementGuide += `\n\nSPEZIFISCHE ANWEISUNG:\n${instruction}\n`;
    }

    const prompt = `Du bist ein erfahrener Erasmus+ Antragsschreiber.

████████████████████████████████████████████████████████████
KRITISCHE REGEL: MINIMALE ÄNDERUNGEN!
████████████████████████████████████████████████████████████

Du darfst den Text NICHT komplett neu schreiben!

STATTDESSEN:
- Behalte 90-95% des Originaltextes WORT FÜR WORT unverändert
- Ändere NUR die Stellen, die im Feedback/Anweisung genannt werden
- Füge fehlende Details an passenden Stellen EIN
- Der verbesserte Text muss dem Original sehr ähnlich bleiben

████████████████████████████████████████████████████████████

ABSCHNITTSTYP: ${sectionType}

PROJEKTKONTEXT:
${projectContext?.projectTitle ? `- Titel: ${projectContext.projectTitle}` : ''}
${projectContext?.sector ? `- Sektor: ${projectContext.sector}` : ''}

AKTUELLER INHALT (90-95% davon BEIBEHALTEN!):
${JSON.stringify(currentContent, null, 2)}

${improvementGuide}

AUFGABE - NUR KLEINE ÄNDERUNGEN:
1. Lies den aktuellen Inhalt GENAU
2. Identifiziere die SPEZIFISCHEN Stellen, die geändert werden sollen
3. Ändere NUR diese Stellen - der Rest bleibt IDENTISCH
4. Wenn keine Anweisung gegeben: Verbessere NUR Rechtschreibung/Grammatik

BEISPIEL für korrekte Verbesserung:
- Original: "Wir nutzen Tools für Kommunikation."
- Anweisung: "Tool-Namen ergänzen"
- Richtig: "Wir nutzen Tools wie Slack und Zoom für Kommunikation."
- FALSCH: "Die Kommunikation erfolgt über moderne digitale Plattformen..." (komplett neu!)

${langInstructions[language] || langInstructions.de}

Antworte NUR mit dem JSON-Objekt (gleiche Struktur wie Input, minimale Textänderungen).`;

    const MAX_RETRIES = 2;
    let attempt = 0;
    let currentKeyIdx = 0;
    let response;
    let data;

    while (attempt < MAX_RETRIES) {
      try {
        apiKey = availableKeys[currentKeyIdx % availableKeys.length];
        response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 8192,
            },
          }),
        });

        if (response.status === 429) {
          attempt++;
          // Try fallback key if available
          if (availableKeys.length > 1) {
            currentKeyIdx = (currentKeyIdx + 1) % availableKeys.length;
            console.log(`Improve API 429. Switching to key ${currentKeyIdx + 1}/${availableKeys.length}`);
          }
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Improve API 429. Waiting ${delay}ms...`);
          if (attempt >= MAX_RETRIES) throw new Error('API-Rate-Limit erreicht (429). Bitte warte 1-2 Minuten und versuche es erneut.');
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        data = await response.json();

        if (data.error) {
          if (data.error.code === 429 || data.error.message.includes('Resource exhausted')) {
            attempt++;
            // Try fallback key if available
            if (availableKeys.length > 1) {
              currentKeyIdx = (currentKeyIdx + 1) % availableKeys.length;
              console.log(`Improve API 429 (body). Switching to key ${currentKeyIdx + 1}/${availableKeys.length}`);
            }
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Improve API 429 (body). Waiting ${delay}ms...`);
            if (attempt >= MAX_RETRIES) throw new Error('API-Rate-Limit erreicht (429). Bitte warte 1-2 Minuten und versuche es erneut.');
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error(data.error.message);
        }

        break; // Success
      } catch (error: any) {
        attempt++;
        if (attempt >= MAX_RETRIES) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!data) throw new Error('Failed to get response from Gemini');

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON aus Antwort extrahieren
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Versuche Array zu finden
      const arrayMatch = responseText.match(/\[[\s\S]*\]/);
      if (!arrayMatch) {
        return NextResponse.json({
          error: 'Konnte keine gültige Verbesserung erstellen'
        }, { status: 500 });
      }
      try {
        const improvedContent = JSON.parse(arrayMatch[0]);
        return NextResponse.json({
          improvedContent,
          appliedChanges: evaluatorFeedback?.suggestions || [instruction || 'Allgemeine Verbesserung'],
        });
      } catch {
        return NextResponse.json({
          error: 'JSON-Parsing fehlgeschlagen'
        }, { status: 500 });
      }
    }

    try {
      const improvedContent = JSON.parse(jsonMatch[0]);

      return NextResponse.json({
        improvedContent,
        appliedChanges: evaluatorFeedback?.suggestions || [instruction || 'Allgemeine Verbesserung'],
      });
    } catch {
      return NextResponse.json({
        error: 'JSON-Parsing fehlgeschlagen'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Improve section error:', error);
    return NextResponse.json({
      error: (error as Error).message
    }, { status: 500 });
  }
}
