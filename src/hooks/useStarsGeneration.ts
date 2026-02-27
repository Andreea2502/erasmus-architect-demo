import { useStarsConceptStore } from '@/store/stars-concept-store';
import { useAppStore } from '@/store/app-store';
import { generateContentAction, generateJsonContentAction } from '@/app/actions/gemini';
import { getEnhanceIdeaPrompt } from '@/lib/concept-prompts';
import {
    getStarsConceptProposalsPrompt,
    getPartnershipNarrativePrompt,
    getChallengeNarrativePrompt,
    getOpportunityNarrativePrompt,
    getProjectResponsePrompt,
    getStarsGoalsPrompt,
    getStarsTargetGroupsPrompt,
    getStarsMethodologyPrompt,
    getAssembleStarsExposePrompt,
    buildPartnershipFactsBlock,
    buildSelectedConceptBlock,
    buildKpiReferenceBlock,
} from '@/lib/stars-prompts';
import { ResearchSource } from '@/types/concept';
import { StarsGoal, StarsTargetGroup, StarsMethodPrinciple, StarsConceptProposal } from '@/types/stars-concept';
import { extractTextFromPDF, extractTextFromDocx } from '@/lib/rag-system';

// ============================================================================
// SYSTEM INSTRUCTIONS
// ============================================================================

const NARRATIVE_SYSTEM = 'Du bist ein erfahrener EU-Projektberater und Grant Writer. Schreibe professionell, narrativ und evidenzbasiert.';
const JSON_SYSTEM = 'Du bist ein Erasmus+ Experte. Antworte NUR im JSON-Format. Kein Markdown, kein Fließtext.';
const TRANSLATION_SYSTEM = 'Du bist ein Erasmus+ Übersetzungs-Experte. Antworte NUR im Markdown-Format.';

// ============================================================================
// HELPER: Timeout wrapper
// ============================================================================

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${label}: Zeitlimit überschritten (${ms / 1000}s).`)), ms)
        ),
    ]);
}

// ============================================================================
// HELPER: Clean JSON from AI response
// ============================================================================

function cleanJsonResponse(text: string): string {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

// ============================================================================
// HELPER: Build source context string from analyzed sources
// ============================================================================

function buildSourceContext(sources: ResearchSource[]): string {
    return sources
        .filter(s => s.isAnalyzed)
        .map(s => `QUELLE "${s.title}":\n${s.summary}\nErkenntnisse: ${s.keyFindings?.join('; ')}`)
        .join('\n\n');
}

// ============================================================================
// HOOK
// ============================================================================

export function useStarsGeneration() {
    const store = useStarsConceptStore();
    const partners = useAppStore(s => s.partners);

    // ========================================================================
    // SHARED: Build partnership facts block for all generators
    // ========================================================================

    const getPartnershipFacts = (): string => {
        const allPartners = useAppStore.getState().partners;
        const duration = store.duration || (store.actionType === 'KA210' ? 12 : 24);
        const budget = store.budgetTier || (store.actionType === 'KA220' ? 250000 : 60000);

        // Build partner details from selected partners
        const partnerDetails = store.selectedPartners.map(sp => {
            const p = allPartners.find(pp => pp.id === sp.partnerId);
            if (!p) return null;
            return {
                name: p.organizationName,
                country: p.country,
                city: p.city,
                role: sp.role === 'COORDINATOR' ? 'Coordinator' : 'Partner',
                type: p.organizationType || 'Organization',
            };
        }).filter(Boolean) as { name: string; country: string; city?: string; role: string; type: string }[];

        if (partnerDetails.length === 0) return '';

        return buildPartnershipFactsBlock(partnerDetails, budget, duration, store.actionType);
    };

    // ========================================================================
    // SHARED: Get selected concept and build concept context block
    // ========================================================================

    const getSelectedConcept = () => {
        if (!store.selectedConceptId) return null;
        return store.conceptProposals.find(c => c.id === store.selectedConceptId) || null;
    };

    const getConceptContext = (): string => {
        const concept = getSelectedConcept();
        return buildSelectedConceptBlock(concept);
    };

    // ========================================================================
    // Step 1: Idea Enhancement (reuse same logic as classic)
    // ========================================================================

    const enhanceIdea = async () => {
        store.updateState({ isEnhanced: false });
        try {
            // getEnhanceIdeaPrompt expects ConceptState -- the STARS store has the same
            // base fields (idea, targetGroup, problem, priorityFocus, sector) so we cast
            const prompt = getEnhanceIdeaPrompt(store as any);
            const response = await generateContentAction(
                prompt,
                'Du bist Projektentwickler. Antworte NUR im JSON-Format. Kein Markdown.',
                0.7,
                30000
            );
            const clean = cleanJsonResponse(response);
            const parsed = JSON.parse(clean);

            store.updateState({
                enhancedIdea: parsed.enhancedIdea || store.idea,
                enhancedProblem: parsed.enhancedProblem || store.problem,
                isEnhanced: true,
            });
        } catch (e) {
            console.error('Enhance idea error:', e);
            // Fallback: use raw input as enhanced
            store.updateState({
                enhancedIdea: store.idea,
                enhancedProblem: store.problem,
                isEnhanced: true,
            });
        }
    };

    // ========================================================================
    // Step 2: Source Analysis (reuse same logic as classic)
    // ========================================================================

    const runAnalysis = async (sourceId: string) => {
        const source = store.sources.find(s => s.id === sourceId);
        if (!source) return;

        store.updateField('sources', store.sources.map(s =>
            s.id === sourceId ? { ...s, isAnalyzing: true, error: undefined } : s
        ));

        try {
            const prompt = `Analysiere diese Forschungsquelle und extrahiere die wichtigsten Erkenntnisse.

QUELLE: "${source.title}"

INHALT:
${source.content.substring(0, 10000)}

Antworte im JSON-Format:
{
  "summary": "Kurze Zusammenfassung (3-4 Sätze)",
  "keyFindings": ["Erkenntnis 1", "Erkenntnis 2", "Erkenntnis 3", "Erkenntnis 4", "Erkenntnis 5"]
}`;

            const response = await generateContentAction(
                prompt,
                'Du bist ein Forschungsanalyst. Antworte NUR im JSON-Format.',
                0.7,
                45000
            );
            const clean = cleanJsonResponse(response);
            const parsed = JSON.parse(clean);

            store.updateField('sources', store.sources.map(s =>
                s.id === sourceId ? {
                    ...s,
                    summary: parsed.summary,
                    keyFindings: parsed.keyFindings,
                    isAnalyzed: true,
                    isAnalyzing: false,
                } : s
            ));
        } catch (e) {
            console.error('Source analysis error:', e);
            store.updateField('sources', store.sources.map(s =>
                s.id === sourceId ? {
                    ...s,
                    isAnalyzing: false,
                    error: 'Analyse fehlgeschlagen. Bitte erneut versuchen.',
                } : s
            ));
        }
    };

    // ========================================================================
    // Step 2: File Upload (PDF, DOCX, TXT, MD)
    // ========================================================================

    const handleFileUpload = async (files: FileList) => {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            const sourceId = `src_${Date.now()}_${i}`;

            const newSource: ResearchSource = {
                id: sourceId,
                title: file.name.replace(/\.(txt|md|pdf|docx|doc)$/i, ''),
                content: '',
                type: 'study',
                fileType: ext,
                isAnalyzed: false,
                isAnalyzing: false,
                isExtracting: true,
            };

            // Use direct store setState to prevent race conditions with multiple files
            useStarsConceptStore.setState((prev) => ({
                sources: [...prev.sources, newSource],
            }));

            try {
                let text = '';
                if (ext === 'pdf') {
                    const result = await withTimeout(extractTextFromPDF(file), 30000, `PDF "${file.name}"`);
                    text = result.text;
                } else if (ext === 'docx' || ext === 'doc') {
                    text = await withTimeout(extractTextFromDocx(file), 30000, `DOCX "${file.name}"`);
                } else {
                    // TXT, MD, and other text files
                    text = await withTimeout(file.text(), 10000, `Datei "${file.name}"`);
                }

                const trimmedContent = text.substring(0, 50000);

                // Update source with extracted content
                useStarsConceptStore.setState((prev) => ({
                    sources: prev.sources.map(s =>
                        s.id === sourceId
                            ? { ...s, content: trimmedContent, isExtracting: false }
                            : s
                    ),
                }));

                // Auto-analyze if there is enough content
                if (trimmedContent.length > 50) {
                    // We need to call runAnalysis after state is updated.
                    // The source now has content, so runAnalysis will find it.
                    // Small delay to ensure state propagation
                    setTimeout(() => runAnalysis(sourceId), 100);
                }
            } catch (err) {
                console.error(`Error extracting ${file.name}:`, err);
                useStarsConceptStore.setState((prev) => ({
                    sources: prev.sources.map(s =>
                        s.id === sourceId
                            ? {
                                ...s,
                                isExtracting: false,
                                error: `Datei konnte nicht gelesen werden: ${ext.toUpperCase()}-Format fehlerhaft`,
                            }
                            : s
                    ),
                }));
            }
        }
    };

    // ========================================================================
    // Step 2b: Generate 3 STARS Concept Proposals
    // ========================================================================

    const generateConceptProposals = async () => {
        store.updateState({ isGeneratingConcepts: true, conceptError: undefined });

        try {
            const sourceContext = buildSourceContext(store.sources);
            const duration = store.duration || (store.actionType === 'KA210' ? 12 : 24);
            const budget = store.budgetTier || (store.actionType === 'KA220' ? 250000 : 60000);
            const partnershipFacts = getPartnershipFacts();

            const prompt = getStarsConceptProposalsPrompt(
                store.idea,
                store.enhancedIdea,
                store.problem,
                store.enhancedProblem,
                store.targetGroup,
                store.sector,
                store.actionType,
                store.priorityFocus,
                duration,
                budget,
                sourceContext,
                store.additionalInstructions,
                partnershipFacts
            );

            const response = await generateContentAction(prompt, JSON_SYSTEM, 0.8, 60000);
            const clean = cleanJsonResponse(response);
            const parsed = JSON.parse(clean);

            const conceptsArray = parsed.concepts || parsed;
            const proposals: StarsConceptProposal[] = (Array.isArray(conceptsArray) ? conceptsArray : []).map(
                (c: any, i: number) => ({
                    id: `stars_concept_${Date.now()}_${i}`,
                    title: c.title || '',
                    acronym: (c.acronym || '').replace(/\s*\(.*?\)\s*$/, '').trim(), // Remove parenthetical expansion
                    summary: c.summary || '',
                    approach: c.approach || '',
                    innovation: c.innovation || '',
                    mainOutputs: c.mainOutputs || [],
                    euPolicyAlignment: c.euPolicyAlignment || [],
                    selected: false,
                })
            );

            store.updateState({
                conceptProposals: proposals,
                conceptsGenerated: true,
                isGeneratingConcepts: false,
                // Clear selected concept when regenerating
                selectedConceptId: null,
                projectTitle: '',
                projectAcronym: '',
                euPolicyAlignment: [],
            });
        } catch (e: any) {
            console.error('Concept proposals error:', e);
            store.updateState({
                isGeneratingConcepts: false,
                conceptError: e?.message || 'Konzeptvorschläge konnten nicht generiert werden. Bitte erneut versuchen.',
            });
        }
    };

    // ========================================================================
    // Step 2c: Select a Concept Proposal
    // ========================================================================

    const selectConceptProposal = (conceptId: string) => {
        const concept = store.conceptProposals.find(c => c.id === conceptId);
        if (!concept) return;

        store.updateState({
            selectedConceptId: conceptId,
            conceptProposals: store.conceptProposals.map(c => ({
                ...c,
                selected: c.id === conceptId,
            })),
            // Set the project identity from the selected concept
            projectTitle: concept.title,
            projectAcronym: concept.acronym,
            euPolicyAlignment: concept.euPolicyAlignment,
            // Clear downstream generated content when switching concepts
            challengeNarrative: '',
            opportunityNarrative: '',
            projectResponse: '',
            goals: [],
            starsTargetGroups: [],
            methodPrinciples: [],
            partnershipNarrative: '',
            fullExpose: null,
        });
    };

    // ========================================================================
    // Step 3: Partnership Narrative
    // ========================================================================

    const generatePartnershipNarrative = async () => {
        store.updateState({ isGeneratingPartnershipNarrative: true, partnershipNarrativeError: undefined });

        try {
            const allPartners = useAppStore.getState().partners;
            const partnersDetail = store.selectedPartners.map(sp => {
                const p = allPartners.find(pp => pp.id === sp.partnerId);
                if (!p) return '';
                const expertise = p.expertiseAreas?.slice(0, 3).map(e => e.domain).join(', ') || 'k.A.';
                return `- ${sp.role}: ${p.organizationName} (${p.country}) - Expertise: ${expertise}`;
            }).filter(Boolean).join('\n');

            const ideaText = store.enhancedIdea || store.idea;
            const partnershipFacts = getPartnershipFacts();
            const sourceContext = buildSourceContext(store.sources);
            const conceptContext = getConceptContext();
            const prompt = getPartnershipNarrativePrompt(ideaText, partnersDetail, store.actionType, store.sector, partnershipFacts, sourceContext, conceptContext);

            const response = await generateContentAction(prompt, NARRATIVE_SYSTEM, 0.7, 45000);
            store.updateState({ partnershipNarrative: response.trim(), isGeneratingPartnershipNarrative: false });
        } catch (e: any) {
            console.error('Partnership narrative error:', e);
            store.updateState({
                isGeneratingPartnershipNarrative: false,
                partnershipNarrativeError: e?.message || 'Partnerschaftsnarrative konnte nicht generiert werden. Bitte erneut versuchen.',
            });
        }
    };

    // ========================================================================
    // Step 4.1: The Challenge (Section 3.1)
    // ========================================================================

    const generateChallenge = async () => {
        store.updateState({ isGeneratingChallenge: true, challengeError: undefined });

        try {
            const sourceContext = buildSourceContext(store.sources);
            const problemText = store.enhancedProblem || store.problem;
            const duration = store.duration || (store.actionType === 'KA210' ? 12 : 24);
            const partnershipFacts = getPartnershipFacts();

            const conceptContext = getConceptContext();
            const prompt = getChallengeNarrativePrompt(
                problemText,
                store.targetGroup,
                store.sector,
                sourceContext,
                store.actionType,
                duration,
                partnershipFacts,
                conceptContext
            );

            const response = await generateContentAction(prompt, NARRATIVE_SYSTEM, 0.7, 60000);

            let text = response;
            if (text.startsWith('```markdown')) {
                text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
            }

            store.updateState({ challengeNarrative: text.trim(), isGeneratingChallenge: false });
        } catch (e: any) {
            console.error('Challenge narrative error:', e);
            store.updateState({
                isGeneratingChallenge: false,
                challengeError: e?.message || 'Challenge-Narrativ konnte nicht generiert werden. Bitte erneut versuchen.',
            });
        }
    };

    // ========================================================================
    // Step 4.2: The Opportunity (Section 3.2)
    // ========================================================================

    const generateOpportunity = async () => {
        store.updateState({ isGeneratingOpportunity: true, opportunityError: undefined });

        try {
            const sourceContext = buildSourceContext(store.sources);
            const ideaText = store.enhancedIdea || store.idea;
            const partnershipFacts = getPartnershipFacts();

            const conceptContext = getConceptContext();
            const prompt = getOpportunityNarrativePrompt(
                store.challengeNarrative,
                ideaText,
                sourceContext,
                store.sector,
                partnershipFacts,
                conceptContext
            );

            const response = await generateContentAction(prompt, NARRATIVE_SYSTEM, 0.7, 60000);

            let text = response;
            if (text.startsWith('```markdown')) {
                text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
            }

            store.updateState({ opportunityNarrative: text.trim(), isGeneratingOpportunity: false });
        } catch (e: any) {
            console.error('Opportunity narrative error:', e);
            store.updateState({
                isGeneratingOpportunity: false,
                opportunityError: e?.message || 'Opportunity-Narrativ konnte nicht generiert werden. Bitte erneut versuchen.',
            });
        }
    };

    // ========================================================================
    // Step 4.3: The Project Response (Section 3.3)
    // ========================================================================

    const generateResponse = async () => {
        store.updateState({ isGeneratingResponse: true, responseError: undefined });

        try {
            const ideaText = store.enhancedIdea || store.idea;
            const selectedConcept = getSelectedConcept();
            // Use innovation from selected concept — this is the core differentiator
            const innovation = selectedConcept?.innovation || ideaText;
            const partnershipFacts = getPartnershipFacts();
            const sourceContext = buildSourceContext(store.sources);
            const conceptContext = getConceptContext();

            const prompt = getProjectResponsePrompt(
                store.challengeNarrative,
                store.opportunityNarrative,
                ideaText,
                innovation,
                partnershipFacts,
                sourceContext,
                conceptContext
            );

            const response = await generateContentAction(prompt, NARRATIVE_SYSTEM, 0.7, 60000);

            let text = response;
            if (text.startsWith('```markdown')) {
                text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
            }

            store.updateState({ projectResponse: text.trim(), isGeneratingResponse: false });
        } catch (e: any) {
            console.error('Project response error:', e);
            store.updateState({
                isGeneratingResponse: false,
                responseError: e?.message || 'Projektantwort konnte nicht generiert werden. Bitte erneut versuchen.',
            });
        }
    };

    // ========================================================================
    // Step 4.4: Project Goals (Section 4) — JSON generation
    // ========================================================================

    const generateGoals = async () => {
        store.updateState({ isGeneratingGoals: true, goalsError: undefined });

        try {
            const sourceContext = buildSourceContext(store.sources);
            const ideaText = store.enhancedIdea || store.idea;
            const duration = store.duration || (store.actionType === 'KA210' ? 12 : 24);
            const partnershipFacts = getPartnershipFacts();

            const conceptContext = getConceptContext();
            const prompt = getStarsGoalsPrompt(
                store.challengeNarrative,
                ideaText,
                sourceContext,
                duration,
                store.actionType,
                partnershipFacts,
                conceptContext
            );

            const response = await generateJsonContentAction(prompt, JSON_SYSTEM, 0.5);
            const clean = cleanJsonResponse(response);
            const parsed = JSON.parse(clean);

            const goalsArray = Array.isArray(parsed) ? parsed : (parsed.goals || []);
            const goals: StarsGoal[] = goalsArray.map((g: any, i: number) => ({
                id: `goal_${Date.now()}_${i}`,
                number: g.number || i + 1,
                statement: g.statement || '',
                rationale: g.rationale || '',
                measurableOutcome: g.measurableOutcome || '',
            }));

            store.updateState({ goals, isGeneratingGoals: false });
        } catch (e: any) {
            console.error('Goals generation error:', e);
            store.updateState({
                isGeneratingGoals: false,
                goalsError: e?.message || 'Projektziele konnten nicht generiert werden. Bitte erneut versuchen.',
            });
        }
    };

    // ========================================================================
    // Step 4.5: Target Groups (Section 5) — JSON generation
    // ========================================================================

    const generateTargetGroups = async () => {
        store.updateState({ isGeneratingTargetGroups: true, targetGroupsError: undefined });

        try {
            const ideaText = store.enhancedIdea || store.idea;
            const partnershipFacts = getPartnershipFacts();
            const sourceContext = buildSourceContext(store.sources);

            const conceptContext = getConceptContext();
            const prompt = getStarsTargetGroupsPrompt(
                store.targetGroup,
                ideaText,
                store.sector,
                store.challengeNarrative,
                partnershipFacts,
                sourceContext,
                conceptContext
            );

            const response = await generateJsonContentAction(prompt, JSON_SYSTEM, 0.5);
            const clean = cleanJsonResponse(response);
            const parsed = JSON.parse(clean);

            const tgArray = Array.isArray(parsed) ? parsed : (parsed.targetGroups || []);
            const targetGroups: StarsTargetGroup[] = tgArray.map((tg: any, i: number) => ({
                id: `tg_${Date.now()}_${i}`,
                level: tg.level || 'PRIMARY',
                name: tg.name || '',
                description: tg.description || '',
                characteristicsAndNeeds: tg.characteristicsAndNeeds || '',
                roleInProject: tg.roleInProject || '',
                estimatedReach: tg.estimatedReach || '',
            }));

            store.updateState({ starsTargetGroups: targetGroups, isGeneratingTargetGroups: false });
        } catch (e: any) {
            console.error('Target groups generation error:', e);
            store.updateState({
                isGeneratingTargetGroups: false,
                targetGroupsError: e?.message || 'Zielgruppen konnten nicht generiert werden. Bitte erneut versuchen.',
            });
        }
    };

    // ========================================================================
    // Step 4.6: Methodological Approach (Section 6) — JSON generation
    // ========================================================================

    const generateMethodology = async () => {
        store.updateState({ isGeneratingMethodology: true, methodologyError: undefined });

        try {
            const ideaText = store.enhancedIdea || store.idea;
            const goalsText = store.goals
                .map(g => `G${g.number}: ${g.statement}`)
                .join('\n');
            const selectedConcept = getSelectedConcept();
            // Use innovation from selected concept — not additionalInstructions
            const innovation = selectedConcept?.innovation || ideaText;
            const partnershipFacts = getPartnershipFacts();
            const sourceContext = buildSourceContext(store.sources);
            const conceptContext = getConceptContext();

            const prompt = getStarsMethodologyPrompt(
                ideaText,
                goalsText,
                innovation,
                store.sector,
                partnershipFacts,
                sourceContext,
                conceptContext
            );

            const response = await generateJsonContentAction(prompt, JSON_SYSTEM, 0.5);
            const clean = cleanJsonResponse(response);
            const parsed = JSON.parse(clean);

            const principlesArray = Array.isArray(parsed) ? parsed : (parsed.principles || parsed.methodology || []);
            const principles: StarsMethodPrinciple[] = principlesArray.map((p: any, i: number) => ({
                id: `method_${Date.now()}_${i}`,
                name: p.name || '',
                description: p.description || '',
            }));

            store.updateState({ methodPrinciples: principles, isGeneratingMethodology: false });
        } catch (e: any) {
            console.error('Methodology generation error:', e);
            store.updateState({
                isGeneratingMethodology: false,
                methodologyError: e?.message || 'Methodologie konnte nicht generiert werden. Bitte erneut versuchen.',
            });
        }
    };

    // ========================================================================
    // Step 5: Full Expose Assembly
    // ========================================================================

    const generateFullExpose = async () => {
        store.updateState({ isGeneratingExpose: true, exposeError: undefined });

        try {
            const allPartners = useAppStore.getState().partners;
            const partnershipFacts = getPartnershipFacts();

            // Resolve title/acronym from selected concept
            const selectedConcept = store.conceptProposals.find(c => c.id === store.selectedConceptId);
            const projectTitle = store.projectTitle || selectedConcept?.title || 'Untitled Project';
            const projectAcronym = store.projectAcronym || selectedConcept?.acronym || 'N/A';

            // Build partners table data
            const partnersTable = store.selectedPartners.map(sp => {
                const p = allPartners.find(pp => pp.id === sp.partnerId);
                if (!p) return '';
                const expertise = p.expertiseAreas?.slice(0, 3).map(e => e.domain).join(', ') || 'k.A.';
                return `| ${sp.role} | ${p.organizationName} | ${p.country} | ${expertise} |`;
            }).filter(Boolean).join('\n');

            // Build associated partners text
            const associatedText = store.associatedPartners.length > 0
                ? store.associatedPartners.map(ap => `- ${ap.description} (${ap.country}) -- Role: ${ap.role}`).join('\n')
                : 'None';

            // Build goals JSON for prompt
            const goalsJson = JSON.stringify(store.goals, null, 2);

            // Build target groups JSON for prompt
            const targetGroupsJson = JSON.stringify(store.starsTargetGroups, null, 2);

            // Build methodology JSON for prompt
            const methodologyJson = JSON.stringify(store.methodPrinciples, null, 2);

            const budget = store.budgetTier || (store.actionType === 'KA220' ? 250000 : 60000);
            const duration = store.duration || (store.actionType === 'KA210' ? 12 : 24);

            // Build KPI reference sheet from user-edited goals and target groups
            const kpiReference = buildKpiReferenceBlock(store.goals, store.starsTargetGroups);

            const prompt = getAssembleStarsExposePrompt(
                projectTitle,
                projectAcronym,
                store.sector,
                store.actionType,
                duration,
                budget,
                store.euPolicyAlignment,
                store.partnershipNarrative,
                partnersTable,
                associatedText,
                store.challengeNarrative,
                store.opportunityNarrative,
                store.projectResponse,
                goalsJson,
                targetGroupsJson,
                methodologyJson,
                store.additionalInstructions,
                partnershipFacts,
                kpiReference
            );

            const response = await generateContentAction(
                prompt,
                'Du bist ein Senior Erasmus+ Proposal Editor. Erstelle ein professionelles Markdown-Dokument.',
                0.7,
                60000
            );

            let finalMarkdown = response;
            if (finalMarkdown.startsWith('```markdown')) {
                finalMarkdown = finalMarkdown.replace(/^```markdown\n/, '').replace(/\n```$/, '');
            }

            store.updateState({ fullExpose: finalMarkdown.trim(), isGeneratingExpose: false });
        } catch (e: any) {
            console.error('Full expose generation error:', e);
            store.updateState({
                isGeneratingExpose: false,
                exposeError: e?.message || 'Expose konnte nicht generiert werden. Bitte erneut versuchen.',
            });
        }
    };

    // ========================================================================
    // Step 5: Translate Expose (German -> English)
    // ========================================================================

    const translateExpose = async () => {
        if (!store.fullExpose) return;

        store.updateState({ isTranslatingExpose: true, exposeError: undefined });

        try {
            const prompt = `Du bist ein professioneller Übersetzer für EU-Fördermittelanträge (Erasmus+).
Deine Aufgabe ist es, den folgenden Projekt-Expose vom Deutschen in ein professionelles, formelles und überzeugendes britisches Englisch zu übersetzen.
Achte darauf, dass Erasmus+ spezifische Fachbegriffe (z.B. "Work Package", "Deliverables", "Target Group", "Dissemination", "Cooperation Partnership", "Small-Scale Partnership") korrekt verwendet werden.
Erhalte die Markdown-Formatierung strikt bei. Gib mir AUSSCHLIESSLICH den übersetzten Text zurück, keinen Kommentar davor oder danach.

PROJEKT-EXPOSE:
${store.fullExpose}`;

            const response = await generateContentAction(prompt, TRANSLATION_SYSTEM, 0.2, 60000);

            let finalMarkdown = response;
            if (finalMarkdown.startsWith('```markdown')) {
                finalMarkdown = finalMarkdown.replace(/^```markdown\n/, '').replace(/\n```$/, '');
            }

            store.updateState({ fullExpose: finalMarkdown.trim(), isTranslatingExpose: false });
        } catch (e: any) {
            console.error('Translation error:', e);
            store.updateState({
                isTranslatingExpose: false,
                exposeError: e?.message || 'Übersetzung fehlgeschlagen. Bitte erneut versuchen.',
            });
        }
    };

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    return {
        enhanceIdea,
        runAnalysis,
        handleFileUpload,
        generateConceptProposals,
        selectConceptProposal,
        generatePartnershipNarrative,
        generateChallenge,
        generateOpportunity,
        generateResponse,
        generateGoals,
        generateTargetGroups,
        generateMethodology,
        generateFullExpose,
        translateExpose,
    };
}
