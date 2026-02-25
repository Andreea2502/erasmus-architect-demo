/**
 * API Route: Intelligente Partner-Vorschläge
 * ==========================================
 * Analysiert die Projektidee und schlägt passende Partner aus dem CRM vor
 */

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

interface Partner {
  id: string;
  organizationName: string;
  country: string;
  organizationType: string;
  expertiseAreas?: { domain: string; description?: string }[];
  targetGroups?: { group: string }[];
  previousProjects?: { title: string; programme: string }[];
  sectorsActive?: string[];
}

interface ProjectIdea {
  description: string;
  mainObjective: string;
  targetGroups: string[];
  sector: string;
  actionType: string;
}

export async function POST(request: NextRequest) {
  try {
    const { partners, projectIdea, language = 'de' } = await request.json() as {
      partners: Partner[];
      projectIdea: ProjectIdea;
      language: string;
    };

    if (!partners || partners.length === 0) {
      return NextResponse.json({ error: 'Keine Partner vorhanden' }, { status: 400 });
    }

    if (!projectIdea?.description) {
      return NextResponse.json({ error: 'Projektidee erforderlich' }, { status: 400 });
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
      es: 'Responde en español.',
      fr: 'Réponds en français.',
      it: 'Rispondi in italiano.',
    };

    const partnersInfo = partners.map(p => ({
      id: p.id,
      name: p.organizationName,
      country: p.country,
      type: p.organizationType,
      expertise: p.expertiseAreas?.map(e => e.domain).join(', ') || 'Nicht angegeben',
      targetGroups: p.targetGroups?.map(t => t.group).join(', ') || 'Nicht angegeben',
      previousProjects: p.previousProjects?.length || 0,
      sectors: p.sectorsActive?.join(', ') || 'Nicht angegeben',
    }));

    const prompt = `Du bist ein erfahrener Erasmus+ Berater. Analysiere welche Partner aus der verfügbaren Liste am besten zu diesem Projekt passen.

PROJEKTIDEE:
${projectIdea.description}

HAUPTZIEL:
${projectIdea.mainObjective}

ZIELGRUPPEN:
${projectIdea.targetGroups.join(', ')}

SEKTOR: ${projectIdea.sector}
AKTIONSTYP: ${projectIdea.actionType}

VERFÜGBARE PARTNER:
${JSON.stringify(partnersInfo, null, 2)}

DEINE AUFGABE:
1. Analysiere jeden Partner auf Passung zur Projektidee
2. Wähle die 3-5 am besten passenden Partner
3. Begründe KURZ warum jeder Partner passt
4. Schlage eine Rollenverteilung vor (wer sollte Lead sein?)

WICHTIGE KRITERIEN:
- Mindestens 3 verschiedene Länder für ${projectIdea.actionType}
- Passende Expertise-Bereiche
- Erfahrung mit den Zielgruppen
- Sektor-Übereinstimmung
- Komplementäre Stärken (nicht alle gleich)

Antwort NUR als JSON:
{
  "suggestedPartnerIds": ["id1", "id2", "id3"],
  "suggestions": [
    {
      "partnerId": "id1",
      "reason": "Kurze Begründung warum dieser Partner passt",
      "suggestedRole": "LEAD|CONTENT_EXPERT|PILOT_SITE|DISSEMINATION|EVALUATION",
      "matchScore": 85
    }
  ],
  "consortiumAnalysis": {
    "coverageAssessment": "Wie gut deckt das Konsortium alle Aspekte ab?",
    "missingExpertise": ["Falls etwas fehlt"],
    "geographicSpread": "Bewertung der geografischen Verteilung",
    "overallScore": 78
  }
}`;

    const systemContext = `Du bist ein erfahrener Erasmus+ Programmberater mit 15 Jahren Erfahrung in der Zusammenstellung von EU-Projektkonsortien.
Du weißt exakt, was ein starkes Konsortium ausmacht, gemäß der "Erasmus+ Goldene Regel":
- Mindestens 3 Partner aus 3 verschiedenen EU-Ländern.
- KOMPLEMENTÄRE EXPERTISE: Eine Mischung aus verschiedenen Organisationstypen (Uni, NGO, KMU).
- TECH & TOUCH STRATEGIE: Ein perfektes Duo besteht aus Partnern, die methodische Exzellenz (Tech) liefern und solchen, die direkten Zugang zur Zielgruppe (Touch) haben.
- GEOGRAFISCHE DIVERSITÄT: Eine Balance zwischen West-Ost und Nord-Süd Regionen.
- ROLLENKLARHEIT: "Kein Partner ohne Rolle" – jeder muss einen unverzichtbaren Beitrag leisten.

${langInstructions[language] || langInstructions.de}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemContext}\n\n---\n\n${prompt}` }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4096,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Konnte kein gültiges JSON extrahieren' }, { status: 500 });
    }

    try {
      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json({ error: 'JSON-Parsing fehlgeschlagen' }, { status: 500 });
    }

  } catch (error) {
    console.error('Suggest partners error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
