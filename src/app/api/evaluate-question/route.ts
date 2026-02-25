
import { NextRequest, NextResponse } from 'next/server';
import { generateContentAction } from '@/app/actions/gemini';

export async function POST(req: NextRequest) {
    try {
        const { question, answer, projectContext, language = 'en' } = await req.json();

        if (!question || !answer) {
            return NextResponse.json({ error: 'Missing question or answer' }, { status: 400 });
        }

        const langText = language === 'de' ? 'German' : 'English';

        const systemPrompt = `Du bist ein Erasmus+ Projektprüfer.

AUFGABE: Finde KONKRETE Verbesserungsmöglichkeiten im Text.

PROJEKT-KONTEXT:
- Projekttitel: ${projectContext?.projectTitle || 'N/A'}
- Sektor: ${projectContext?.sector || 'N/A'}

FRAGE: "${question}"

AKTUELLE ANTWORT:
"${answer}"

PRÜFKRITERIEN:
1. Konkretheit (fehlen Zahlen, Beispiele, Tool-Namen?)
2. Vollständigkeit (fehlen wichtige Aspekte?)
3. Erasmus+ Relevanz (Inklusion, Digital, Green, Demokratie)
4. Klarheit und Präzision

DEINE AUFGABE:
Finde 3-5 KONKRETE Verbesserungspunkte. Jeder Punkt muss:
- Eine SPEZIFISCHE Stelle im Text benennen
- Einen KONKRETEN Verbesserungsvorschlag machen
- Den VERBESSERTEN Textabschnitt liefern (nur dieser Teil, nicht der ganze Text!)

WICHTIG zur Formatierung:
- In "issue", "location", "suggestion": Schreibe normalen Fließtext OHNE Markdown
- In "improvedText": Nutze **fett** für Überschriften und wichtige Begriffe, - für Aufzählungen (passend zum Stil des Originaltextes)

Antworte im JSON-Format:
{
  "score": number (0-10),
  "improvements": [
    {
      "issue": "Was ist das Problem? (kurz)",
      "location": "Wo im Text? (Zitat oder Beschreibung)",
      "suggestion": "Was soll geändert werden?",
      "improvedText": "Der verbesserte Textabschnitt (NUR dieser Teil, mit **fett** und - Aufzählungen wenn passend)"
    }
  ]
}

Gib 3-5 Verbesserungspunkte. Wenn der Text sehr gut ist, können es auch weniger sein.
Sprache: ${langText}`;

        const response = await generateContentAction(JSON.stringify({ question, answer }), systemPrompt);

        // Clean JSON
        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const evaluation = JSON.parse(cleanJson);

        // Clean any markdown from the improvements
        if (evaluation.improvements && Array.isArray(evaluation.improvements)) {
            evaluation.improvements = evaluation.improvements.map((imp: any) => ({
                ...imp,
                issue: (imp.issue || '').replace(/\*\*/g, '').replace(/##/g, '').replace(/###/g, ''),
                location: (imp.location || '').replace(/\*\*/g, '').replace(/##/g, '').replace(/###/g, ''),
                suggestion: (imp.suggestion || '').replace(/\*\*/g, '').replace(/##/g, '').replace(/###/g, ''),
                improvedText: imp.improvedText || ''  // Keep markdown in improved text for rich display
            }));
        }

        return NextResponse.json(evaluation);

    } catch (error) {
        console.error('Evaluation error:', error);
        return NextResponse.json({ error: 'Failed to evaluate' }, { status: 500 });
    }
}
