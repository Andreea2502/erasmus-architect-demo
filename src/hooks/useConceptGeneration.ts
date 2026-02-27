import { useState } from 'react';
import { useConceptStore } from '@/store/concept-store';
import { useLanguageStore } from '@/store/language-store';
import { generateContentAction, generateJsonContentAction } from '@/app/actions/gemini';
import {
    getEnhanceIdeaPrompt,
    getGenerateConceptsPrompt,
    getCompareConceptsPrompt,
    getGenerateObjectivesPrompt,
    getRegenerateSingleObjectivePrompt,
    getGenerateDetailedConceptPrompt
} from '@/lib/concept-prompts';
import { ConceptProposal, ResearchSource, SmartObjective } from '@/types/concept';
import { useAppStore } from '@/store/app-store'; // needed to get full partner info for detailed concept

export function useConceptGeneration() {
    const language = useLanguageStore(s => s.language);
    const partners = useAppStore(s => s.partners);
    const store = useConceptStore();

    // We keep a local isGenerating state for UI that needs a simple spinner
    const [isGenerating, setIsGenerating] = useState(false);

    const enhanceIdea = async () => {
        setIsGenerating(true);
        try {
            const prompt = getEnhanceIdeaPrompt(store);
            const response = await generateContentAction(prompt, 'Du bist Projektentwickler. Antworte NUR im JSON-Format. Kein Markdown.', 0.7, 30000);
            const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);

            store.updateState({
                enhancedIdea: parsed.enhancedIdea || store.idea,
                enhancedProblem: parsed.enhancedProblem || store.problem,
                isEnhanced: true,
            });
        } catch (e) {
            console.error('Enhance idea error:', e);
            // Fallback
            store.updateState({
                enhancedIdea: store.idea,
                enhancedProblem: store.problem,
                isEnhanced: true,
            });
        }
        setIsGenerating(false);
    };

    const runAnalysis = async (sourceId: string, title: string, content: string) => {
        store.updateField('sources', store.sources.map(s => s.id === sourceId ? { ...s, isAnalyzing: true, error: undefined } : s));
        try {
            const prompt = `Du bist ein Forschungsanalyst der Quellen für einen EU-Förderantrag (Erasmus+) aufbereitet.
Deine Aufgabe: Extrahiere NUR harte Fakten, Zahlen, Statistiken und zitierbare Evidenz aus dieser Quelle.
Allgemeine Beschreibungen und Einleitungen sind NICHT relevant — nur konkrete Daten.

QUELLE: "${title}"

INHALT (gekürzt):
${content.substring(0, 25000)}

EXTRAHIERE folgende Informationen im JSON-Format:

{
  "sourceInfo": {
    "authors": "Autor(en) oder 'Unbekannt'",
    "year": "Erscheinungsjahr oder 'k.A.'",
    "institution": "Herausgebende Institution oder 'k.A.'"
  },
  "summary": "2-3 Sätze: Kernaussage für einen Erasmus+ Antrag",
  "statistics": [
    {
      "metric": "Was wird gemessen",
      "value": "Konkreter Zahlenwert",
      "context": "Land/Region, Zeitraum, Stichprobe",
      "citation": "Kurzreferenz"
    }
  ],
  "quotableData": [
    "Direkt zitierbare Sätze mit konkreten Daten oder Ergebnissen (max 5)"
  ],
  "keyFindings": [
    "3-5 Kernerkenntnisse mit konkretem Bezugspunkt (Zahl, Land, Zielgruppe)"
  ]
}

REGELN:
- "statistics": ALLE Zahlen, Prozentangaben, Metriken extrahieren. Minimum 3.
- "quotableData": Nur Sätze mit einer Zahl, einem Studienergebnis oder messbaren Befund.
- "keyFindings": Keine vagen Aussagen. Nur Erkenntnisse mit konkretem Bezug.
- Antworte NUR mit validem JSON.`;

            const response = await generateContentAction(
                prompt,
                'Du bist ein Forschungsanalyst für EU-Förderanträge. Extrahiere harte Fakten und Daten. Antworte NUR im JSON-Format.',
                0.3,
                45000
            );
            const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);

            store.updateField('sources', store.sources.map(s => s.id === sourceId ? {
                ...s,
                summary: parsed.summary,
                keyFindings: parsed.keyFindings,
                statistics: parsed.statistics,
                quotableData: parsed.quotableData,
                sourceInfo: parsed.sourceInfo,
                isAnalyzed: true,
                isAnalyzing: false,
            } : s));
        } catch (e) {
            console.error('Source analysis error:', e);
            store.updateField('sources', store.sources.map(s => s.id === sourceId ? {
                ...s,
                isAnalyzing: false,
                error: 'Analyse fehlgeschlagen. Bitte erneut versuchen.',
            } : s));
        }
    };

    const generateConcepts = async () => {
        setIsGenerating(true);
        try {
            const sourceContext = store.sources
                .filter(s => s.isAnalyzed)
                .map(s => {
                    const citation = s.sourceInfo
                        ? `(${[s.sourceInfo.authors, s.sourceInfo.institution, s.sourceInfo.year].filter(Boolean).join(', ')})`
                        : '';
                    const statsBlock = s.statistics && s.statistics.length > 0
                        ? `\nSTATISTIKEN:\n${s.statistics.map((st: any) => `  - ${st.metric}: ${st.value} ${st.context ? `(${st.context})` : ''} ${st.citation ? `[${st.citation}]` : ''}`).join('\n')}`
                        : '';
                    const quotesBlock = s.quotableData && s.quotableData.length > 0
                        ? `\nZITIERBARE EVIDENZ:\n${s.quotableData.map((q: string) => `  - "${q}"`).join('\n')}`
                        : '';
                    const findingsBlock = s.keyFindings && s.keyFindings.length > 0
                        ? `\nKERNERKENNTNISSE:\n${s.keyFindings.map(f => `  - ${f}`).join('\n')}`
                        : '';
                    return `QUELLE: "${s.title}" ${citation}\n${s.summary || ''}${statsBlock}${quotesBlock}${findingsBlock}`;
                })
                .join('\n\n---\n\n');

            const allSourceContext = store.sources
                .filter(s => !s.isAnalyzed && s.content)
                .map(s => `QUELLE "${s.title}":\n${s.content.substring(0, 1500)}`)
                .join('\n\n');

            const prompt = getGenerateConceptsPrompt(store, sourceContext, allSourceContext, language);

            const response = await generateContentAction(prompt, 'Du bist ein Erasmus+ Projektentwickler. Antworte NUR im JSON-Format. Kein Markdown.', 0.7, 45000);
            const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);

            const concepts: ConceptProposal[] = (parsed.concepts || []).map((c: any, i: number) => ({
                id: `concept_${Date.now()}_${i}`,
        ...c,
        selected: false,
        savedForLater: false,
      }));

      store.updateState({ concepts, conceptsGenerated: true, conceptError: undefined });
    } catch (e: any) {
      console.error('Concept generation error:', e);
      store.updateState({
        conceptError: e?.message || 'Konzeptgenerierung fehlgeschlagen. Bitte erneut versuchen.',
        conceptsGenerated: false,
      });
    }
    setIsGenerating(false);
  };

  const compareConcepts = async () => {
    if (store.concepts.length < 2) return;

    store.updateState({ isComparingConcepts: true, conceptComparisonResult: null, compareConceptsError: undefined });

    try {
      const conceptsContext = store.concepts.map((c: ConceptProposal) =>
        `ID: ${c.id}\nTITEL: ${c.title}\nAKRONYM: ${c.acronym}\nZUSAMMENFASSUNG: ${c.summary}\nINNOVATION: ${c.innovation}\nOUTPUTS: ${c.mainOutputs?.join(', ')}`
      ).join('\n\n---\n\n');

      const prompt = getCompareConceptsPrompt(store, conceptsContext);

      const response = await generateJsonContentAction(prompt, 'Du bist Projekt-Evaluator. Antworte NUR im JSON-Format.', 0.5);
      const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);

            store.updateState({ conceptComparisonResult: parsed });
        } catch (e: any) {
            console.error('Concept comparison error:', e);
            store.updateState({ compareConceptsError: 'Fehler bei der KI-Bewertung: ' + (e.message || 'Unbekannter Fehler') });
        } finally {
            store.updateState({ isComparingConcepts: false });
        }
    };

    const generateObjectives = async () => {
        setIsGenerating(true);
        try {
            const selectedConcept = store.concepts.find(c => c.id === store.selectedConceptId);
            if (!selectedConcept) {
                setIsGenerating(false);
                store.updateState({ objectivesError: 'Bitte wähle zuerst ein Konzept in Schritt 2 aus.' });
                return;
            }

            const sourceContext = store.sources
                .filter(s => s.isAnalyzed)
                .map(s => `"${s.title}": ${s.keyFindings?.join('; ')}`)
        .join('\n');

      const prompt = getGenerateObjectivesPrompt(store, sourceContext, selectedConcept);

      const response = await generateContentAction(prompt, 'Du bist Projektplaner. Antworte NUR im JSON-Format.', 0.7, 45000);
      const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);

            const objectives: SmartObjective[] = (parsed.objectives || []).map((o: any, i: number) => ({
                id: `obj_${Date.now()}_${i}`,
        ...o,
      }));

      store.updateState({ objectives, selectedObjectiveIds: objectives.map(o => o.id), objectivesGenerated: true, objectivesError: undefined });
    } catch (e: any) {
      console.error('Objectives generation error:', e);
      store.updateState({ objectivesError: e?.message || 'SMART-Ziele konnten nicht generiert werden. Bitte erneut versuchen.' });
    }
    setIsGenerating(false);
  };

  const regenerateSingleObjective = async (objectiveId: string) => {
    store.updateState({ regeneratingObjectiveId: objectiveId, objectivesError: undefined });
    try {
      const selectedConcept = store.concepts.find(c => c.id === store.selectedConceptId);
      if (!selectedConcept) throw new Error("Bitte Konzept auswählen.");

      const sourceContext = store.sources
        .filter(s => s.isAnalyzed)
        .map(s => `"${s.title}": ${s.keyFindings?.join('; ')}`)
        .join('\n');

      const existingObjectivesContext = store.objectives
        .filter(o => o.id !== objectiveId)
        .map((o) => `- ${o.text}`)
        .join('\n');

      const prompt = getRegenerateSingleObjectivePrompt(store, sourceContext, existingObjectivesContext, selectedConcept);

      const response = await generateContentAction(prompt, 'Du bist Projektplaner. Antworte NUR im JSON-Format.', 0.7, 30000);
      const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);

            if (!parsed.objective || !parsed.objective.text) {
                throw new Error("Ungültige KI-Antwort.");
            }

            store.updateState({
                regeneratingObjectiveId: null,
                objectives: store.objectives.map(o =>
                    o.id === objectiveId
                        ? { ...o, ...parsed.objective }
                        : o
                )
            });
        } catch (e: any) {
            console.error('Single objective generation error:', e);
            store.updateState({ objectivesError: e?.message || 'SMART-Ziel konnte nicht neu generiert werden.', regeneratingObjectiveId: null });
        }
    };

    const generateDetailedConcept = async () => {
        store.updateState({ isGeneratingDetailedConcept: true, detailedConceptError: undefined });
        try {
            const selectedConcept = store.concepts.find(c => c.id === store.selectedConceptId);
            if (!selectedConcept) throw new Error("Kein Konzept ausgewählt.");

            const isKA210 = store.actionType === 'KA210';

            const consortiumText = store.selectedPartners.map(sp => {
                const p = partners.find(pp => pp.id === sp.partnerId);
                return p ?`- ${sp.role}: ${p.organizationName} (${p.country}) - Expertise: ${p.expertiseAreas?.slice(0, 3).map(e => e.domain).join(', ')}` : '';
      }).filter(Boolean).join('\n');

      const sourceContext = store.sources
        .filter(s => s.isAnalyzed)
        .map(s => `"${s.title}": ${s.summary}\nErkenntnisse: ${s.keyFindings?.join('; ')}`)
        .join('\n\n');

      const objectivesText = store.objectives
        .filter(o => store.selectedObjectiveIds.includes(o.id))
        .map((o, i) => `${i + 1}. ${o.text} (Priorität: ${o.erasmusPriority || 'Keine'})`)
        .join('\n');

      const wpText = store.wpSuggestions
        .filter(wp => store.selectedWpNumbers.includes(wp.number))
        .map(wp => `${isKA210 ? 'Aktivität' : 'WP'}${wp.number}: ${wp.title} (${wp.lead})\n${wp.description}\nErgebnisse: ${wp.deliverables.join(', ')}`)
        .join('\n\n');

      const prompt = getGenerateDetailedConceptPrompt(store, consortiumText, sourceContext, objectivesText, wpText, selectedConcept);

      const response = await generateContentAction(prompt, 'Du bist ein erfahrener Erasmus+ Grant Writer. Antworte NUR im Markdown-Format.', 0.7, 60000);

      let finalMarkdown = response;
      if (finalMarkdown.startsWith('```markdown')) {
        finalMarkdown = finalMarkdown.replace(/^```markdown\n/, '').replace(/\n```$/, '');
      }

      store.updateState({ detailedConcept: finalMarkdown.trim(), isGeneratingDetailedConcept: false });
    } catch (e: any) {
      console.error('Detailed concept generation error:', e);
      store.updateState({
        detailedConceptError: e?.message || 'Generierung fehlgeschlagen. Bitte erneut versuchen.',
        isGeneratingDetailedConcept: false,
      });
    }
  };

  const translateConcept = async () => {
    if (!store.detailedConcept) return;

    store.updateState({ isTranslatingConcept: true, detailedConceptError: undefined });
    try {
      const prompt = `Du bist ein professioneller Übersetzer für EU-Fördermittelanträge (Erasmus+). 
Deine Aufgabe ist es, den folgenden Konzeptentwurf vom Deutschen in ein professionelles, formelles und überzeugendes britisches Englisch zu übersetzen.
Achte darauf, dass Erasmus+ spezifische Fachbegriffe (z.B. "Work Package", "Deliverables", "Target Group", "Dissemination") korrekt verwendet werden.
Erhalte die Markdown-Formatierung strikt bei. Gib mir AUSSCHLIESSLICH den übersetzten Text zurück, keinen Kommentar davor oder danach.

KONZEPT-ENTWURF:
${store.detailedConcept}`;

      const response = await generateContentAction(prompt, 'Du bist ein Erasmus+ Übersetzungs-Experte. Antworte NUR im Markdown-Format.', 0.2, 60000);

      let finalMarkdown = response;
      if (finalMarkdown.startsWith('```markdown')) {
        finalMarkdown = finalMarkdown.replace(/^```markdown\n/, '').replace(/\n```$/, '');
      }

      store.updateState({ detailedConcept: finalMarkdown.trim(), isTranslatingConcept: false });
    } catch (e: any) {
      console.error('Translation error:', e);
      store.updateState({
        detailedConceptError: e?.message || 'Übersetzung fehlgeschlagen. Bitte erneut versuchen.',
        isTranslatingConcept: false,
      });
    }
  };

  return {
    isGenerating,
    enhanceIdea,
    runAnalysis,
    generateConcepts,
    compareConcepts,
    generateObjectives,
    regenerateSingleObjective,
    generateDetailedConcept,
    translateConcept,
  };
}
