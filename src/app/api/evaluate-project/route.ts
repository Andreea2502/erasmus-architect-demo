import { NextResponse } from 'next/server';
import { callGemini } from '@/lib/ai-service';
import { PipelineState } from '@/lib/project-pipeline';
import { getOfficialPipelineStructure } from '@/lib/official-pipeline-structure';

export const maxDuration = 300; // 5 minutes logic execution

export async function POST(req: Request) {
    try {
        const { pipelineState, language } = await req.json();

        if (!pipelineState || !pipelineState.answers) {
            return NextResponse.json(
                { error: 'Missing pipeline state answers' },
                { status: 400 }
            );
        }

        const state = pipelineState as PipelineState;
        const structure = getOfficialPipelineStructure(state.configuration?.actionType || 'KA220', state.configuration?.wpCount || 5);

        // Filter out unanswered questions to not penalize empty drafts too harshly,
        // actually, as an evaluator, we SHOULD penalize missing sections because it means the proposal is incomplete.
        let fullApplicationText = '';

        // Helper: extract answer value from raw string or {value: string} object
        const getAnswerText = (key: string): string => {
            const answer = state.answers[key];
            if (!answer) return '';
            if (typeof answer === 'string') return answer;
            if (typeof answer === 'object' && 'value' in answer && typeof (answer as any).value === 'string') return (answer as any).value;
            return '';
        };

        // Build a readable document out of the structure + answers
        structure.forEach(chapter => {
            fullApplicationText += `\n\n# Chapter ${chapter.id}: ${chapter.title}\n`;
            chapter.sections.forEach(section => {
                fullApplicationText += `\n## Section: ${section.title}\n`;
                section.questions.forEach(q => {
                    if (q.type === 'info' || q.type === 'select' || q.type === 'multiselect' || q.type === 'number') return;

                    // For partner-specific questions (Chapter 2), look up with partnerId suffix
                    if (chapter.id === 2) {
                        // Try all possible partner answer keys
                        const partnerKeys = Object.keys(state.answers).filter(k => k.startsWith(q.id + '_'));
                        if (partnerKeys.length > 0) {
                            partnerKeys.forEach(pk => {
                                const answerText = getAnswerText(pk);
                                if (answerText) {
                                    fullApplicationText += `\n**Q: ${q.fullQuestion}**\n${answerText}\n`;
                                }
                            });
                        } else {
                            fullApplicationText += `\n**Q: ${q.fullQuestion}**\n[NOT ANSWERED]\n`;
                        }
                    } else {
                        const answerText = getAnswerText(q.id);
                        if (answerText) {
                            fullApplicationText += `\n**Q: ${q.fullQuestion}**\n${answerText}\n`;
                        } else {
                            fullApplicationText += `\n**Q: ${q.fullQuestion}**\n[NOT ANSWERED]\n`;
                        }
                    }
                });
            });
        });

        const langName = language === 'de' ? 'Deutsch' : 'English';

        const systemPrompt = `Du bist ein strenger, hochqualifizierter offizieller Erasmus+ Gutachter (Evaluator) der Europäischen Kommission.
Deine Aufgabe ist es, einen eingereichten Projektantrag präzise nach den offiziellen Qualitätskriterien zu bewerten.
Du bist unbestechlich, kritisch, aber konstruktiv. Du bestrafst hohle Phrasen, fehlende KPIs, unkonkrete Angaben und lobst spezifische, fundierte und stark auf die Zielgruppe zugeschnittene Konzepte.

Du bewertest nach exakt 4 Kategorien:
1. Relevanz des Projekts (max 30 Punkte)
2. Qualität der Projektkonzeption und -umsetzung (max 20 Punkte)
3. Qualität der Partnerschaft und der Kooperationsvereinbarungen (max 20 Punkte)
4. Wirkung (Impact) und Verbreitung (max 30 Punkte)

Generiere deine Bewertung im folgenden strikten JSON Format:
{
  "score": [Gesamtpunktzahl von 0-100],
  "categories": {
    "relevance": {
      "score": [0-30],
      "maxScore": 30,
      "feedback": "Ein prägnanter, gutachterlicher Absatz zur Relevanz.",
      "strengths": ["Stärke 1", "Stärke 2"],
      "weaknesses": ["Schwäche 1", "Schwäche 2"]
    },
    "design": {
      "score": [0-20],
      "maxScore": 20,
      "feedback": "Ein prägnanter, gutachterlicher Absatz zum Projektdesign (WP, Aktivitäten).",
      "strengths": ["Stärke 1"],
      "weaknesses": ["Schwäche 1"]
    },
    "partnership": {
      "score": [0-20],
      "maxScore": 20,
      "feedback": "Ein prägnanter, gutachterlicher Absatz zur Partnerschaft (Profile, Aufgaben).",
      "strengths": ["Stärke 1"],
      "weaknesses": ["Schwäche 1"]
    },
    "impact": {
      "score": [0-30],
      "maxScore": 30,
      "feedback": "Ein prägnanter, gutachterlicher Absatz zum Impact (KPIs, Nachhaltigkeit, Dissemination).",
      "strengths": ["Stärke 1"],
      "weaknesses": ["Schwäche 1"]
    }
  },
  "overallFeedback": "Eine zusammenfassende Einschätzung des Gutachters (2-3 Sätze).",
  "suggestions": [
    "Konkreter, handlungsorientierter Vorschlag 1 zur Punktverbesserung",
    "Konkreter, handlungsorientierter Vorschlag 2 zur Punktverbesserung",
    "Konkreter, handlungsorientierter Vorschlag 3 zur Punktverbesserung"
  ]
}

WICHTIGSTE REGELN ZUR BEWERTUNG:
- Ziehe massiv Punkte ab für Antworten, die "[NOT ANSWERED]" sind. Das bedeutet, das Antragsformular ist extrem lückenhaft. Wenn wesentliche Kapitel (wie Impact oder Partnerschaft) unvollständig sind, darf der Gesamtscore nicht über 50 liegen!
- Ein durchschnittlicher Entwurf liegt bei 60-70 Punkten. Vergib nur 85+ Punkte, wenn spezifische Budgets, klare Milestones und hochauflösende KPIs vorhanden sind, ansonsten bewerte streng.
- Antworte vollständig auf ${langName}!
- Antworte AUSSCHLIESSLICH mit gültigem JSON, kein Text davor oder danach! Codeblöcke wie \`\`\`json sind zur Sicherheit erlaubt, aber nichts anderes.`;

        const userPrompt = `Bitte evaluiere den folgenden Erasmus+ Antrag:

Titel: ${state.projectTitle || 'Ohne Titel'}
Aktionstyp: ${state.configuration?.actionType || 'KA220'}
Dauer: ${state.configuration?.duration || 24} Monate
Budget: ${state.configuration?.totalBudget || 250000} EUR

### GANZER ANTRAG TEXT ###
${fullApplicationText}`;

        console.log(`[Evaluate Project API] Send request to Gemini for pipeline evaluation...`);

        const response = await callGemini(userPrompt, systemPrompt);

        // JSON Bereinigung wie in den anderen Routen
        let jsonString = response;
        const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            jsonString = codeBlockMatch[1].trim();
        }

        // Strict parsing
        try {
            const evaluationData = JSON.parse(jsonString);
            return NextResponse.json(evaluationData);
        } catch (parseError) {
            console.error('[Evaluate Project API] Error parsing Gemini JSON response:', parseError);
            console.log('Raw response was:', response);
            return NextResponse.json(
                { error: 'Die KI hat ein ungültiges Format zurückgegeben', details: response },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('[Evaluate Project API] Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', message: error.message },
            { status: 500 }
        );
    }
}
