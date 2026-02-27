/**
 * PROJECT PIPELINE - Multi-Step Projektantrag Generator
 * =====================================================
 * Generiert schrittweise einen vollständigen Erasmus+ Projektantrag
 * mit kritischer Evaluierung nach jedem Schritt
 */

import { vectorStore, queryWithRAG } from './rag-system';
import { getOfficialPipelineStructure, PipelineSection } from './official-pipeline-structure';
import { SavedConcept, StudySummary, ProjectKnowledgePool } from '@/store/types';
import { LANGUAGE_NAMES, Language } from './i18n';
import { enhancePrompt, getChapterInstructions, ANTI_PHRASES, FEW_SHOT_EXAMPLES } from './knowledge-prompts';
import {
  COMPACT_ERASMUS_CONTEXT,
  ELIGIBLE_ACTIVITIES,
  WORK_PACKAGE_GUIDELINES
} from '@/lib/erasmus-knowledge';

// ============================================================================
// TYPES
// ============================================================================

export interface ConsortiumPartner {
  id: string;
  crmId?: string; // Link to the original partner in CRM
  name: string;
  country: string;
  type: string;
  expertise: string[];
  targetGroups?: string[];
  previousProjects?: any[]; // Updated to any[] to handle complex project objects
  isLead?: boolean;
  role?: string; // e.g. "Technical Partner", "Coordinator"
  costPerDay?: number; // Tagessatz in Euro (z.B. 300 für RO, 500 für DE)

  // Enriched CRM Data for AI context
  generatedDescriptions?: { title: string; content: string }[];
  uploadedDocuments?: { name: string; type: string; description?: string, summary?: StudySummary }[];
}

export interface ProjectIdea {
  title?: string;
  acronym?: string;
  shortDescription: string;
  targetGroups: string[];
  mainObjective: string;
  sector: 'ADU' | 'VET' | 'SCH' | 'YOU';
  actionType: 'KA220' | 'KA210';
}

// Answer data with metadata for flexible editing
export interface AnswerData {
  value: string;
  mode: 'ai' | 'manual';
  sources?: string[];  // RAG sources used for this answer
  lastEditedAt?: string;  // ISO date string
}

export interface PipelineState {
  // Input
  consortium: ConsortiumPartner[];
  idea: ProjectIdea;
  configuration?: {
    totalBudget: number;
    wpCount: number;
    actionType: 'KA220' | 'KA210';
    duration?: number;
  };
  originalConcept?: SavedConcept;

  // Project Knowledge Pool - documents, websites, notes uploaded for this project
  knowledgePool?: ProjectKnowledgePool;

  // Generated content (builds up over steps)
  projectTitle?: string;
  acronym?: string;
  needsAnalysis?: NeedsAnalysisSection;
  objectives?: ObjectivesSection;
  workPackages?: WorkPackage[];
  methodology?: MethodologySection;
  impact?: ImpactSection;
  dissemination?: DisseminationSection;
  sustainability?: SustainabilitySection;
  budget?: BudgetSection;
  timeline?: TimelineSection;
  executiveSummary?: string;

  // Metadata
  currentStep: number;
  totalSteps: number;
  evaluatorFeedback: EvaluatorFeedback[];
  completedAt?: Date;

  // Official Form Answers - now with metadata
  // Key = QuestionID, Value = AnswerData or simple string (backwards compat)
  answers: Record<string, string | string[] | AnswerData>;

  // Pre-configured Work Packages from Setup Phase
  wpConfigurations?: {
    wpNumber: number;
    type: string;
    title: string;
    titleDE: string;
    leadPartnerId: string;
    selectedActivities: string[];
    selectedDeliverables: string[];
    budgetPercent: number;
    duration: { start: number; end: number };
    objectives: string[];
    customTitle?: string;
  }[];
}

export interface NeedsAnalysisSection {
  // Standard Erasmus+ Specific Questions (Question + Answer)
  specificQuestions?: {
    question: string;
    answer: string;
  }[];
  problemStatement: string;
  statistics: { fact: string; source: string }[];
  targetGroupNeeds: { group: string; needs: string[] }[];
  gaps: string[];
  europeanDimension: string;
}

export interface ObjectivesSection {
  // Standard Erasmus+ Specific Questions (Question + Answer)
  specificQuestions?: {
    question: string;
    answer: string;
  }[];
  generalObjective: string;
  specificObjectives: { id: string; description: string; indicators: string[] }[];
  alignment?: { priority: string; howAddressed: string }[];
  alignmentWithPriorities?: string;
}

export interface WorkPackage {
  id?: string;
  number: number;
  title: string;
  lead?: string;
  duration?: { start: number; end: number } | string;
  objectives: string[];
  description?: string;
  // Standard Erasmus+ Specific Questions (Question + Answer)
  specificQuestions?: {
    question: string;
    answer: string;
  }[];
  indicators?: {
    quantitative: string[];
    qualitative: string[];
  };
  partnerRoles?: {
    partner: string;
    role: string;
  }[];
  budgetRationale?: string;
  activities: Activity[];
  deliverables: Deliverable[];
  milestones?: Milestone[];
  budget?: number;
}

export interface Activity {
  id: string;
  title: string;
  // Detailed 4-point description
  content?: string; // Describe the content
  objectivesAlignment?: string; // How it helps reach WP objectives
  expectedResults?: string; // Expected results
  participants?: string; // Number and profile of participants

  description: string; // Legacy/Summary
  responsible?: string;
  participatingPartners?: string[]; // New field for other partners
  month?: { start: number; end: number } | string;
  type?: string;
  leader?: string;
}

export interface Deliverable {
  id: string;
  title: string;
  type: 'report' | 'toolkit' | 'curriculum' | 'platform' | 'event' | 'other';
  description: string;
  dueMonth: number;
  disseminationLevel: 'public' | 'consortium' | 'confidential';
}

export interface Milestone {
  id: string;
  title: string;
  month: number;
  verificationMeans: string;
}

export interface MethodologySection {
  // Standard Erasmus+ Specific Questions (Question + Answer)
  specificQuestions?: {
    question: string;
    answer: string;
  }[];
  approach: string;
  innovativeElements: string[];
  qualityAssurance: string;
  riskManagement: { risk: string; mitigation: string; probability: 'low' | 'medium' | 'high' }[];
}

export interface ImpactSection {
  // Standard Erasmus+ Specific Questions (Question + Answer)
  specificQuestions?: {
    question: string;
    answer: string;
  }[];
  expectedImpact: string;
  quantitativeIndicators?: { indicator: string; target: string; measurement: string }[];
  qualitativeIndicators?: string[];
  targetGroupBenefits?: { group: string; benefits: string[] }[];
  longTermEffects?: string;
  targetGroupsImpact?: unknown[];
  stakeholderImpact?: unknown[];
}

export interface DisseminationSection {
  // Standard Erasmus+ Specific Questions (Question + Answer)
  specificQuestions?: {
    question: string;
    answer: string;
  }[];
  strategy: string;
  channels: { channel: string; audience: string; frequency: string }[];
  materials: string[];
  events: { type: string; audience: string; timing: string }[];
  multiplierEvents?: { title: string; country: string; participants: number; description: string }[];
}

export interface SustainabilitySection {
  // Standard Erasmus+ Specific Questions (Question + Answer)
  specificQuestions?: {
    question: string;
    answer: string;
  }[];
  strategy: string;
  financialSustainability?: string;
  institutionalSustainability?: string;
  contentSustainability?: string;
  transferability?: string;
  resourcesInfo?: string;
  longTermImpact?: string;
}

export interface EvaluationResult {
  score: number; // 0-100
  categories: {
    relevance: { score: number; maxScore: 30; feedback: string; strengths: string[]; weaknesses: string[] };
    design: { score: number; maxScore: 20; feedback: string; strengths: string[]; weaknesses: string[] };
    partnership: { score: number; maxScore: 20; feedback: string; strengths: string[]; weaknesses: string[] };
    impact: { score: number; maxScore: 30; feedback: string; strengths: string[]; weaknesses: string[] };
  };
  overallFeedback: string;
  suggestions: string[];
}

export interface BudgetSection {
  totalBudget: number;
  perPartner: { partner: string; amount: number; percentage: number }[];
  perWorkPackage: { wp: number; amount: number }[];
  categories: { category: string; amount: number }[];
}

export interface TimelineSection {
  totalMonths: number;
  phases: { name: string; months: string; activities: string[] }[];
  ganttData: { wp: number; start: number; end: number }[];
}

export interface EvaluatorFeedback {
  step: number;
  stepName: string;
  score: number; // 1-10
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  criticalIssues: string[];
  revisedContent?: string;
}

// Final Evaluation Result (Step 8)
export interface FinalEvaluationResult {
  overallScore: number; // 0-100
  timestamp: string;

  // Checklist items with pass/fail status
  checklist: {
    id: string;
    category: 'consistency' | 'completeness' | 'quality' | 'compliance';
    item: string;
    passed: boolean;
    explanation: string; // Knackige Erklärung wenn nicht bestanden
    severity: 'critical' | 'warning' | 'info';
  }[];

  // Consistency checks
  consistencyIssues: {
    issue: string;
    locations: string[]; // Where the inconsistency was found
    suggestion: string;
  }[];

  // Partner-WP alignment
  partnerWPAlignment: {
    partnerId: string;
    partnerName: string;
    assignedWPs: number[];
    responsibilities: string[];
    isConsistent: boolean;
    issues?: string[];
  }[];

  // Character limit compliance
  characterLimitCompliance: {
    questionId: string;
    questionText: string;
    currentLength: number;
    maxLength: number;
    isCompliant: boolean;
  }[];

  // Cross-matching with previous projects (when available)
  crossMatching?: {
    currentProjectElement: string;
    relatedPreviousProject: string;
    connection: string;
    sustainability: string;
  }[];

  // Summary
  summary: string;
  recommendations: string[];
}

// ============================================================================
// PIPELINE STEPS DEFINITION
// ============================================================================

export const getPipelineSteps = (wpCount: number = 5, actionType: 'KA220' | 'KA210' = 'KA220') => {
  // Map the official structure to the pipeline steps format
  const structure = getOfficialPipelineStructure(actionType, wpCount);
  const steps = structure.map(chapter => {
    let generates: string[] = [];

    // Map chapters to state fields
    if (actionType === 'KA210') {
      switch (chapter.id) {
        case 1: generates = ['projectTitle', 'acronym']; break; // Context
        case 2: generates = ['consortium']; break; // Organisations
        case 3: generates = ['needsAnalysis', 'objectives']; break; // Relevance
        case 4: generates = ['workPackages']; break; // Activities -> WPs
        case 5: generates = ['impact', 'dissemination']; break; // Impact
        case 6: generates = ['executiveSummary']; break; // Summary
      }
    } else {
      switch (chapter.id) {
        case 1: generates = ['projectTitle', 'acronym']; break; // Context
        case 2: generates = ['consortium']; break; // Organisations
        case 3: generates = ['needsAnalysis', 'objectives']; break; // Relevance
        case 4: generates = ['partnership']; break; // Partnership
        case 5: generates = ['impact', 'dissemination', 'sustainability']; break; // Impact
        case 6: generates = ['workPackages', 'budget', 'timeline']; break; // Implementation/WPs
        case 7: generates = ['executiveSummary']; break; // Summary
        case 8: generates = ['finalEvaluation']; break; // Final Evaluation (Quality Check)
      }
    }

    return {
      id: chapter.id,
      name: chapter.title,
      description: chapter.sections.map(s => s.title).join(', '),
      generates
    };
  });

  return steps;
};

// Backwards compatibility for existing imports (default 5, KA220)
export const PIPELINE_STEPS = getPipelineSteps(5, 'KA220');



// ============================================================================
// GEMINI API CALL
// ============================================================================

// @ts-ignore
import { generateContentAction } from '@/app/actions/gemini';

async function callGeminiForPipeline(
  prompt: string,
  systemContext: string,
  temperature: number = 0.7
): Promise<string> {
  const MAX_RETRIES = 1; // Reduced: generateContentAction already handles 3 retries internally
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      // Use Server Action instead of direct fetch
      const text = await generateContentAction(prompt, systemContext, temperature, 120000); // 120s for large WP prompts
      return text;
    } catch (error: any) {
      attempt++;
      console.warn(`Gemini generation attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);

      const isResourceExhausted =
        error.message.includes('Resource exhausted') ||
        error.message.includes('429') ||
        error.message.includes('503');

      if (attempt >= MAX_RETRIES) {
        console.error("Max retries reached. Giving up.");
        throw error;
      }

      if (isResourceExhausted) {
        // Aggressive Exponential Backoff: 5s, 10s, 20s...
        const delay = Math.pow(2, attempt) * 5000 + (Math.random() * 2000);
        console.log(`[Backoff] Rate limited (429). Waiting ${Math.round(delay / 1000)}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Small delay for other errors
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw new Error('Gemini generation failed after max retries');
}

// ============================================================================
// RAG CONTEXT BUILDER
// ============================================================================

async function getRAGContext(query: string): Promise<string> {
  try {
    const searchPromise = vectorStore.search({
      query,
      maxChunks: 5,
      minRelevance: 0.2,
    });

    // 10s timeout for RAG search (includes embedding API call)
    const result = await Promise.race([
      searchPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('RAG search timeout (10s)')), 10000)
      )
    ]);

    if (result.chunks.length === 0) {
      return '';
    }

    return `
RELEVANTE INFORMATIONEN AUS HOCHGELADENEN DOKUMENTEN:
=====================================================
${result.context}
=====================================================
Nutze diese Informationen für faktisch korrekte, quellenbasierte Aussagen.
`;
  } catch (e) {
    console.warn('[getRAGContext] Failed or timed out, continuing without RAG:', (e as Error).message);
    return ''; // RAG is optional — generation works without it
  }
}

// ============================================================================
// PROJECT KNOWLEDGE POOL CONTEXT BUILDER
// ============================================================================

/**
 * Builds context string from the project's knowledge pool (documents, websites, notes)
 * This is PROJECT-SPECIFIC knowledge, different from the global RAG vector store
 */
function getKnowledgePoolContext(knowledgePool?: ProjectKnowledgePool): string {
  if (!knowledgePool) return '';

  const sections: string[] = [];

  // Process Documents with AI Analysis
  if (knowledgePool.documents && knowledgePool.documents.length > 0) {
    const docsWithContent = knowledgePool.documents.filter(d => d.status === 'ready' && (d.summary || d.aiAnalysis));
    if (docsWithContent.length > 0) {
      let docSection = '📄 DOKUMENTE AUS DER PROJEKT-WISSENSDATENBANK:\n';
      docSection += '='.repeat(50) + '\n';

      for (const doc of docsWithContent) {
        docSection += `\n📁 ${doc.name}\n`;

        if (doc.aiAnalysis?.organizationName) {
          docSection += `   Organisation: ${doc.aiAnalysis.organizationName}\n`;
        }
        if (doc.aiAnalysis?.mission) {
          docSection += `   Mission: ${doc.aiAnalysis.mission}\n`;
        }
        if (doc.aiAnalysis?.staffSize) {
          docSection += `   Mitarbeitergröße: ${doc.aiAnalysis.staffSize}\n`;
        }
        if (doc.summary) {
          docSection += `   Zusammenfassung: ${doc.summary}\n`;
        }
        if (doc.aiAnalysis?.competences && doc.aiAnalysis.competences.length > 0) {
          docSection += `   Kompetenzen: ${doc.aiAnalysis.competences.join(', ')}\n`;
        }
        if (doc.aiAnalysis?.targetGroups && doc.aiAnalysis.targetGroups.length > 0) {
          docSection += `   Zielgruppen: ${doc.aiAnalysis.targetGroups.join(', ')}\n`;
        }
        if (doc.aiAnalysis?.relevantSectors && doc.aiAnalysis.relevantSectors.length > 0) {
          docSection += `   Sektoren: ${doc.aiAnalysis.relevantSectors.join(', ')}\n`;
        }
        if (doc.aiAnalysis?.completedProjects && doc.aiAnalysis.completedProjects.length > 0) {
          docSection += `   Bisherige Projekte:\n`;
          for (const proj of doc.aiAnalysis.completedProjects.slice(0, 5)) {
            docSection += `     - ${proj.title} (${proj.role}, ${proj.programme}${proj.year ? ', ' + proj.year : ''})\n`;
          }
        }
        if (doc.aiAnalysis?.statistics && doc.aiAnalysis.statistics.length > 0) {
          docSection += `   Statistiken/Kennzahlen:\n`;
          for (const stat of doc.aiAnalysis.statistics.slice(0, 4)) {
            docSection += `     - ${stat.metric}: ${stat.context}\n`;
          }
        }
        if (doc.keyFindings && doc.keyFindings.length > 0) {
          docSection += `   Wichtige Erkenntnisse:\n`;
          for (const finding of doc.keyFindings.slice(0, 5)) {
            docSection += `     • ${finding}\n`;
          }
        }
        if (doc.aiAnalysis?.recommendations && doc.aiAnalysis.recommendations.length > 0) {
          docSection += `   Empfehlungen:\n`;
          for (const rec of doc.aiAnalysis.recommendations.slice(0, 3)) {
            docSection += `     → ${rec}\n`;
          }
        }
        if (doc.aiAnalysis?.keyTerms && doc.aiAnalysis.keyTerms.length > 0) {
          docSection += `   Schlüsselbegriffe: ${doc.aiAnalysis.keyTerms.join(', ')}\n`;
        }
      }
      sections.push(docSection);
    }
  }

  // Process Websites
  if (knowledgePool.websites && knowledgePool.websites.length > 0) {
    const websitesWithContent = knowledgePool.websites.filter(w => w.summary || w.keyPoints?.length);
    if (websitesWithContent.length > 0) {
      let webSection = '\n🌐 WEBSITES AUS DER PROJEKT-WISSENSDATENBANK:\n';
      webSection += '='.repeat(50) + '\n';

      for (const site of websitesWithContent) {
        webSection += `\n🔗 ${site.title || site.url}\n`;
        if (site.summary) {
          webSection += `   ${site.summary}\n`;
        }
        if (site.keyPoints && site.keyPoints.length > 0) {
          webSection += `   Kernpunkte:\n`;
          for (const point of site.keyPoints.slice(0, 5)) {
            webSection += `     • ${point}\n`;
          }
        }
      }
      sections.push(webSection);
    }
  }

  // Process Notes (Post-Its)
  if (knowledgePool.notes && knowledgePool.notes.length > 0) {
    let noteSection = '\n📝 NOTIZEN AUS DER PROJEKT-WISSENSDATENBANK:\n';
    noteSection += '='.repeat(50) + '\n';

    for (const note of knowledgePool.notes) {
      noteSection += `\n🗒️ ${note.title}\n`;
      noteSection += `   ${note.content}\n`;
      if (note.tags && note.tags.length > 0) {
        noteSection += `   Tags: ${note.tags.join(', ')}\n`;
      }
    }
    sections.push(noteSection);
  }

  if (sections.length === 0) return '';

  return `
=======================================================================
🧠 PROJEKT-WISSENSDATENBANK (verwende diese Informationen in der Antwort!)
=======================================================================
${sections.join('\n')}
=======================================================================
WICHTIG: Integriere relevante Fakten, Zahlen und Erkenntnisse aus dieser
Wissensdatenbank in deine Antwort. Verweise auf konkrete Quellen wenn möglich.
`;
}

// ============================================================================
// CROSS-STEP CONTEXT BUILDER
// ============================================================================

/**
 * Builds context from previous pipeline steps + Knowledge Pool for cross-step coherence.
 * Each step receives the relevant outputs from earlier steps so the AI can write
 * coherent, interconnected content.
 */
function buildStepContext(state: PipelineState, stepNumber: number): string {
  const sections: string[] = [];

  // Knowledge Pool — available for ALL steps (not just Step 2)
  const kpContext = getKnowledgePoolContext(state.knowledgePool);
  if (kpContext) {
    sections.push(kpContext);
  }

  // Concept Developer data (if available)
  if (state.originalConcept) {
    const concept = state.originalConcept;
    let conceptSection = 'KONZEPT-ENTWICKLER DATEN:\n';
    if (concept.objectives && concept.objectives.length > 0) {
      conceptSection += 'Definierte Ziele:\n';
      concept.objectives.forEach((o: any, i: number) => {
        conceptSection += `${i + 1}. ${o.text}\n`;
        if (o.indicators && o.indicators.length > 0) {
          conceptSection += `   Indikatoren: ${o.indicators.join(', ')}\n`;
        }
      });
    }
    sections.push(conceptSection);
  }

  // Step 4+: Needs analysis + objectives from Step 3
  if (stepNumber >= 4) {
    if (state.needsAnalysis?.problemStatement) {
      sections.push(`BEDARFSANALYSE (aus Schritt 3):\n${state.needsAnalysis.problemStatement.substring(0, 1500)}`);
    }
    if (state.objectives?.generalObjective) {
      sections.push(`PROJEKTZIELE (aus Schritt 3):\n${state.objectives.generalObjective.substring(0, 1500)}`);
    }
    if (state.objectives?.alignmentWithPriorities) {
      sections.push(`PRIORITÄTEN-ADRESSIERUNG (aus Schritt 3):\n${state.objectives.alignmentWithPriorities.substring(0, 1000)}`);
    }
  }

  // Step 5+: Partnership context from Step 4
  if (stepNumber >= 5) {
    const partnershipKeys = ['partnership_formation', 'task_allocation', 'coordination'];
    const pTexts = partnershipKeys.map(k => {
      const v = state.answers[k];
      if (!v) return '';
      const text = typeof v === 'object' && v !== null && 'value' in v ? (v as any).value : typeof v === 'string' ? v : '';
      return text ? `${k}: ${text.substring(0, 800)}` : '';
    }).filter(Boolean);
    if (pTexts.length > 0) {
      sections.push(`PARTNERSCHAFT (aus Schritt 4):\n${pTexts.join('\n\n')}`);
    }
  }

  // Step 6+: Impact, dissemination, sustainability from Step 5
  if (stepNumber >= 6) {
    if (state.impact?.expectedImpact) {
      sections.push(`ERWARTETER IMPACT (aus Schritt 5):\n${state.impact.expectedImpact.substring(0, 1000)}`);
    }
    if (state.dissemination?.strategy) {
      sections.push(`VERBREITUNGSSTRATEGIE (aus Schritt 5):\n${state.dissemination.strategy.substring(0, 800)}`);
    }
    if (state.sustainability?.strategy) {
      sections.push(`NACHHALTIGKEITSSTRATEGIE (aus Schritt 5):\n${state.sustainability.strategy.substring(0, 800)}`);
    }
  }

  // Step 7: Everything for summary coherence
  if (stepNumber >= 7) {
    if (state.workPackages && state.workPackages.length > 0) {
      const wpSummary = state.workPackages.map(wp =>
        `- WP${wp.number}: ${wp.title} (${wp.duration})`
      ).join('\n');
      sections.push(`WORK PACKAGES (aus Schritt 6):\n${wpSummary}`);
    }
  }

  if (sections.length === 0) return '';

  return `\n=== KONTEXT AUS VORHERIGEN SCHRITTEN & WISSENSDATENBANK ===\n${sections.join('\n\n')}\n=== ENDE KONTEXT ===\n\nWICHTIG: Beziehe dich auf den obigen Kontext, um kohärente, aufeinander aufbauende Inhalte zu generieren. Verweise auf konkrete Ziele, Bedarfe und Strategien aus vorherigen Schritten.\n`;
}

// ============================================================================
// STEP GENERATORS
// ============================================================================

// ============================================================================
// HELPER: GENERIC SECTION GENERATOR (SEQUENTIALLY - ONE QUESTION AT A TIME)
// ============================================================================

/**
 * Generate answers for a section ONE QUESTION AT A TIME.
 * This prevents timeout issues that occur when trying to generate 10+ questions in a single AI call.
 *
 * @param state - Current pipeline state
 * @param sectionId - Section ID to generate
 * @param chapterId - Chapter ID
 * @param language - Language for generation
 * @param extraContext - Optional additional context
 * @param onQuestionProgress - Optional callback for question-by-question progress
 */
async function generateSectionAnswersSequentially(
  state: PipelineState,
  sectionId: string,
  chapterId: number,
  language: string,
  extraContext: string = '',
  onQuestionProgress?: (questionId: string, current: number, total: number) => void
): Promise<Record<string, string>> {
  const actionType = state.configuration?.actionType || 'KA220';
  const wpCount = state.configuration?.wpCount || 5;
  const structure = getOfficialPipelineStructure(actionType, wpCount);
  const chapter = structure.find((c: any) => c.id === chapterId);
  const section = chapter?.sections.find((s: any) => s.id === sectionId);

  if (!chapter || !section) {
    const errorMsg = `Section ${sectionId} not found in chapter ${chapterId}. ActionType: ${actionType}, WP count: ${wpCount}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Filter only questions that need AI-generated answers
  // Exclude: info fields, number fields, select/multiselect dropdowns, and known metadata fields
  const SKIP_AI_GENERATION = ['startDate', 'duration', 'nationalAgency', 'language'];
  const questions = section.questions.filter((q: any) =>
    q.type !== 'info' && q.type !== 'number' && q.type !== 'select' && q.type !== 'multiselect' && !SKIP_AI_GENERATION.includes(q.id)
  );

  console.log(`[generateSectionAnswersSequentially] Generating ${questions.length} questions for section ${sectionId} (filtered from ${section.questions.length} total)`);

  const results: Record<string, string> = {};

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`[generateSectionAnswersSequentially] Question ${i + 1}/${questions.length}: ${q.id}`);
    onQuestionProgress?.(q.id, i + 1, questions.length);

    try {
      // Generate single answer using the existing function
      const answerData = await generateSingleAnswerForSection(
        state,
        q,
        section,
        chapter,
        language,
        extraContext
      );

      results[q.id] = answerData.value;

      // Delay between questions to avoid 429 rate limiting
      // Longer delay for WP sections (many sequential questions)
      if (i < questions.length - 1) {
        const delay = questions.length > 4 ? 2000 : 1000; // 2s for large sections, 1s for small
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (e: any) {
      console.error(`[generateSectionAnswersSequentially] Error for question ${q.id}:`, e.message);
      // If rate limited, wait longer before continuing to next question
      if (e.message?.includes('429') || e.message?.includes('Resource exhausted')) {
        console.log(`[generateSectionAnswersSequentially] Rate limited — waiting 10s before next question...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      results[q.id] = ''; // Empty answer, user can regenerate
    }
  }

  console.log(`[generateSectionAnswersSequentially] Completed ${Object.keys(results).length} answers`);
  return results;
}

/**
 * Generate a single answer for a specific question within a section.
 * Extracted logic for sequential generation.
 */
async function generateSingleAnswerForSection(
  state: PipelineState,
  question: any,
  section: any,
  chapter: any,
  language: string,
  extraContext: string = ''
): Promise<AnswerData> {
  // 240s timeout per individual question (covers RAG + generation + retries)
  // WP questions have large prompts (8-12k tokens) with full project context
  const questionTimeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout: Frage ${question.id} hat nach 240s keine Antwort erhalten`)), 240000)
  );

  const generationPromise = (async (): Promise<AnswerData> => {
    // Build context
    const partnerList = state.consortium.map(p =>
      `- ${p.name} (${p.country}, ${p.type}): ${p.expertise?.join(', ') || 'N/A'}`
    ).join('\n');

    const coordinator = state.consortium.find(p => p.isLead);

    // Get RAG context
    const ragContext = await getRAGContext(
      `Erasmus+ ${question.text} ${chapter.title} Antragsstellung`
    );

    // Character limit - user requested +/- 10-15% tolerance.
    // VARIANTE 1: Buffer for German text so English translation doesn't exceed EU limits
    const isGerman = language === 'de';
    const charLimit = question.charLimit || 3000;

    // If German, target ~75-85% of the max limit. If English, target 90-99%.
    const targetLength = isGerman ? Math.round(charLimit * 0.80) : Math.round(charLimit * 0.90);
    const minLength = isGerman ? Math.round(charLimit * 0.70) : Math.round(charLimit * 0.80);
    const maxLength = isGerman ? Math.round(charLimit * 0.85) : Math.round(charLimit * 0.99);

    // LLMs are notoriously bad at counting characters. Provide WORD counts instead (~7 chars/word)
    const targetWords = Math.round(targetLength / 7);
    const minWords = Math.round(minLength / 7);
    const maxWords = Math.round(maxLength / 7);

    const langName = language === 'de' ? 'Deutsch' : 'English';

    const prompt = `Du bist ein erfahrener Erasmus+ Antragsberater.

═══════════════════════════════════════════════════════════════
REGEL 1: ZEICHEN- UND WORTLIMIT (WICHTIGSTE REGEL!)
═══════════════════════════════════════════════════════════════
MAXIMALES ZEICHENLIMIT: ${charLimit} Zeichen
ZIEL: Schreibe ca. ${targetWords} Wörter (das entspricht etwa ${targetLength} Zeichen, +/- 10-15%).
MINIMUM: ${minWords} Wörter (${minLength} Zeichen) - NICHT WENIGER!
MAXIMUM: ${maxWords} Wörter (${maxLength} Zeichen) - NICHT MEHR!

>>> WICHTIG: KI-Modelle verschätzen sich oft bei Zeichen. Halte dich streng an das WORT-Limit (${minWords}-${maxWords} Wörter)! <<<
>>> Wenn dein Text unter ${minWords} Wörtern ist: SOFORT mehr Details, Beispiele, Begründungen hinzufügen! <<<

═══════════════════════════════════════════════════════════════
REGEL 2: FORMATIERUNG (GUT LESBAR!)
═══════════════════════════════════════════════════════════════
PFLICHT-FORMAT:
• Absätze: Nach jedem Hauptpunkt EINE LEERZEILE einfügen.
• Überschriften: Nutze **fett** AUSSCHLIESSLICH für kurze Abschnitts-Überschriften (z.B. **Bedarfsanalyse**). NIEMALS ganze Absätze oder Sätze fett markieren!
• Aufzählungen: Nutze Spiegelstriche (- ) für Listen (3-5 Punkte pro Liste).
• Hervorhebungen: Nutze **fett** für wichtige Begriffe, Zahlen und Schlüsselwörter - aber sehr sparsam!
• Struktur: 3-5 thematische Absätze mit fetten Überschriften.
• WICHTIG: Wenn es sich um das Feld "Project Title" oder "Project Acronym" handelt, MUSST du auf Englisch antworten, auch wenn die Restsprache auf Deutsch eingestellt ist!

BEISPIEL für gute Struktur:
"**Bedarfsanalyse und Ausgangslage**

Das Projekt adressiert folgende Bedarfe in der Erwachsenenbildung:

- **Digitale Kompetenzlücken**: Beschreibung des ersten Bedarfs mit Details und Zahlen
- **Zugangsbarrieren**: Beschreibung des zweiten Bedarfs mit konkreten Beispielen
- **Qualitätssicherung**: Weitere relevante Bedarfe und Hintergründe

**Zielgruppen und erwarteter Mehrwert**

Die Zielgruppen profitieren durch verbesserte Kompetenzen in...

**Konkrete Maßnahmen und Methodik**

- **Maßnahme A**: Beschreibung mit quantifizierbaren Zielen und Indikatoren
- **Maßnahme B**: Für spezifische Zielgruppe mit messbaren Ergebnissen"

═══════════════════════════════════════════════════════════════
PROJEKT-KONTEXT
═══════════════════════════════════════════════════════════════
Projektidee: ${state.idea.shortDescription || 'Bildungsprojekt'}
Projekttitel: ${state.projectTitle || 'Wird noch generiert'}
Akronym: ${state.acronym || 'Wird noch generiert'}
Aktionstyp: ${state.configuration?.actionType || 'KA220'}
Sektor: ${state.idea.sector === 'ADU' ? 'Erwachsenenbildung' : state.idea.sector === 'VET' ? 'Berufsbildung' : state.idea.sector === 'SCH' ? 'Schulbildung' : 'Jugend'}
Zielgruppen: ${state.idea.targetGroups?.join(', ') || 'Jugendliche, Erwachsene'}

Partner:
${partnerList}
${extraContext ? `\nZusätzlicher Kontext: ${extraContext}` : ''}

═══════════════════════════════════════════════════════════════
DEINE AUFGABE
═══════════════════════════════════════════════════════════════
FRAGE: "${question.fullQuestion || question.text}"
${question.helpText ? `Hinweis: ${question.helpText}` : ''}

Schreibe auf ${langName}. Antworte NUR mit dem Text (keine Einleitung wie "Hier ist...").

CHECKLISTE VOR DEM ANTWORTEN:
☐ Text hat MINDESTENS ${minWords} Wörter (${minLength} Zeichen)? Falls NEIN → SOFORT mehr schreiben! Füge Details, Beispiele und Begründungen hinzu!
☐ Text hat 3-5 ausführliche Absätze mit einer obligatorischen Leerzeile dazwischen?
☐ Wurden NIEMALS ganze Sätze oder Absätze komplett in **fett** geschrieben?
☐ Listen haben Spiegelstriche (- ) mit jeweils 2-3 Sätzen Erklärung?
☐ **Fette Überschriften** für Abschnitte und **fette Begriffe** für Schlüsselwörter verwendet?
☐ Konkrete Zahlen, Beispiele, Methoden und Zielgruppen genannt?`;

    const systemContext = `Du bist EU-Projektexperte für Erasmus+ Anträge.

KRITISCHE REGELN:
1. ZEICHEN- UND WORTLIMIT: Deine Antwort MUSS mindestens ${minWords} Wörter (${minLength} Zeichen) lang sein! Ziel: ${targetWords} Wörter (+/- 10-15%). Wenn dein Entwurf zu kurz ist, füge SOFORT mehr Details, Begründungen, konkrete Beispiele, Zahlen und Methoden hinzu bis du mindestens ${minWords} Wörter erreichst. NIEMALS drunter abgeben!
2. ABSÄTZE: Füge zwingend Leerzeilen zwischen thematischen Blöcken ein.
3. LISTEN: Nutze zwingend Spiegelstriche (- ) für Aufzählungen. Keine Nummern unless explicitly requested.
4. FORMATIERUNG: Nutze **fett** AUSSCHLIESSLICH für kurze Überschriften und einzelne Schlüsselbegriffe. NIEMALS für ganze Sätze oder Absätze!
5. KONKRET: Nenne spezifische Zahlen, Tools, Methoden, Zielgruppen, Länder.
6. AUSFÜHRLICH: Schreibe detaillierte, fundierte Texte. Jeder Punkt verdient 2-3 Sätze Erklärung.

Der Text muss gut lesbar, strukturiert und AUSFÜHRLICH sein - KEINE kurzen Stichpunkte!`;

    try {
      const response = await callGeminiForPipeline(prompt, systemContext, 0.7);

      // Clean response - remove any markdown code blocks or JSON formatting
      let cleanedResponse = response
        .replace(/```(?:json)?/g, '')
        .replace(/^["']|["']$/g, '')
        .trim();

      // Log character count for debugging
      console.log(`[generateSingleAnswerForSection] ${question.id}: ${cleanedResponse.length}/${charLimit} chars (target: ${targetLength})`);

      return {
        value: cleanedResponse,
        mode: 'ai' as const,
        lastEditedAt: new Date().toISOString()
      };
    } catch (e: any) {
      console.error(`[generateSingleAnswerForSection] Error:`, e.message);
      return {
        value: '',
        mode: 'ai' as const,
        lastEditedAt: new Date().toISOString()
      };
    }
  })(); // End of generationPromise async IIFE

  return Promise.race([generationPromise, questionTimeoutPromise]);
}

/**
 * LEGACY: Generate all answers for a section in ONE AI call.
 * Use generateSectionAnswersSequentially instead to avoid timeouts.
 */
async function generateSectionAnswers(
  state: PipelineState,
  sectionId: string,
  chapterId: number,
  language: string,
  extraContext: string = ''
): Promise<Record<string, string>> {
  const actionType = state.configuration?.actionType || 'KA220';
  const wpCount = state.configuration?.wpCount || 5;
  const structure = getOfficialPipelineStructure(actionType, wpCount);
  const chapter = structure.find((c: any) => c.id === chapterId);
  const section = chapter?.sections.find((s: any) => s.id === sectionId);

  if (!chapter || !section) {
    const errorMsg = `Section ${sectionId} not found in chapter ${chapterId}. ActionType: ${actionType}, WP count: ${wpCount}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Build comprehensive project context
  const partnerList = state.consortium.map(p =>
    `- ${p.name} (${p.country}, ${p.type}): ${p.expertise?.join(', ') || 'N/A'}`
  ).join('\n');

  const coordinator = state.consortium.find(p => p.isLead);

  // Get RAG context from knowledge base
  const ragContext = await getRAGContext(
    `Erasmus+ ${section.title} ${chapter.title} Antragsstellung Beispiel Formulierung`
  );


  // Build detailed questions list with guidance and character limits
  const questionsList = section.questions
    .filter((q: any) => q.type !== 'info' && q.type !== 'number') // Skip info-only and number fields
    .map((q: any) => {
      let guidance = '';
      if (q.helpText) guidance = ` (Hinweis: ${q.helpText})`;
      // Add character limit info if available
      const charLimitInfo = q.charLimit ? ` [MAX ${q.charLimit} ZEICHEN!]` : '';
      return `- **${q.id}**: "${q.fullQuestion || q.text}"${guidance}${charLimitInfo}`;
    }).join('\n');

  // Build detailed partner profiles for AI context
  const detailedPartnerContext = state.consortium.map(p => {
    let context = `### ${p.name} (${p.country}, ${p.type})\n`;
    context += `- Rolle: ${p.role || (p.isLead ? 'Koordinator' : 'Partner')}\n`;
    context += `- Expertise: ${p.expertise?.join(', ') || 'N/A'}\n`;
    if (p.targetGroups && p.targetGroups.length > 0) {
      context += `- Zielgruppen: ${p.targetGroups.join(', ')}\n`;
    }
    if (p.previousProjects && p.previousProjects.length > 0) {
      context += `- Bisherige Projekte: ${p.previousProjects.map(proj => typeof proj === 'string' ? proj : proj.title).slice(0, 3).join('; ')}\n`;
    }
    if (p.generatedDescriptions && p.generatedDescriptions.length > 0) {
      context += `- KI-Profil (Auszug): ${p.generatedDescriptions[0].content.substring(0, 500)}...\n`;
    }
    if (p.uploadedDocuments && p.uploadedDocuments.length > 0) {
      context += `- Relevante Dokumente: ${p.uploadedDocuments.map(d => {
        let docStr = `${d.name} (${d.type})`;
        if (d.summary?.executiveSummary) {
          docStr += `: ${d.summary.executiveSummary}`;
        }
        return docStr;
      }).join('; ')}\n`;
    }
    return context;
  }).join('\n');

  // Get chapter-specific instructions for enhanced prompts
  const chapterInstructions = getChapterInstructions(chapterId);
  const antiPhrases = ANTI_PHRASES[language === 'en' ? 'en' : 'de'];

  // Create a rich, detailed prompt with Stage 1 enhancements
  let basePrompt = `Du bist ein erfahrener Erasmus+ Antragsberater mit 15 Jahren Erfahrung. Du schreibst Inhalte für den Abschnitt "${section.title}" im Kapitel "${chapter.title}".

=== PROJEKT-KONTEXT ===
Projektidee: ${state.idea.shortDescription || 'Bildungsprojekt zur Förderung von digitalen Kompetenzen'}
Projekttitel: ${state.projectTitle || 'Wird noch generiert'}
Akronym: ${state.acronym || 'Wird noch generiert'}
Sektor: ${state.idea.sector === 'ADU' ? 'Erwachsenenbildung' : state.idea.sector === 'VET' ? 'Berufsbildung' : state.idea.sector === 'SCH' ? 'Schulbildung' : 'Jugend'}
Aktionstyp: ${state.idea.actionType}
Zielgruppen: ${state.idea.targetGroups?.join(', ') || 'Jugendliche, Erwachsene'}
Hauptziel: ${state.idea.mainObjective || 'Kompetenzentwicklung'}
Budget: ${state.configuration?.totalBudget || 250000} EUR
Projektdauer: ${state.configuration?.duration || 24} Monate

=== KONSORTIUM (DETAILS) ===
${detailedPartnerContext}

=== AUFGABE ===
Beantworte die folgenden Fragen des Erasmus+ Antragsformulars. Jede Antwort muss:
1. Professionell und überzeugend formuliert sein
2. Konkrete Beispiele und ZAHLEN enthalten (keine vagen Aussagen!)
3. Den Erasmus+ Evaluierungskriterien entsprechen
4. Spezifisch auf DIESES Projekt bezogen sein
5. NIEMALS generische Floskeln verwenden
6. ALS FLIESSTEXT geschrieben werden - KEINE Bulletpoint-Listen als Hauptstruktur!

=== ZEICHEN- UND WORTLIMITS (ABSOLUT KRITISCH!) ===
⚠️ JEDE ANTWORT MUSS DAS LIMIT OPTIMAL AUSNUTZEN (+/- 10-15%)! ⚠️
KI-Modelle verschätzen sich bei Zeichen. Halte dich primär an WORT-Grenzen (ca. 7 Zeichen pro Wort):
- Wenn [MAX 3000 ZEICHEN] steht: Schreibe ca. 380-420 Wörter (2600-2900 Zeichen).
- Wenn [MAX 2000 ZEICHEN] steht: Schreibe ca. 250-280 Wörter (1700-1950 Zeichen).
- Wenn [MAX 1500 ZEICHEN] steht: Schreibe ca. 180-210 Wörter (1200-1450 Zeichen).
- Wenn [MAX 500 ZEICHEN] steht: Schreibe ca. 60-70 Wörter (400-480 Zeichen).
- TOLERANZ: +/- 10-15% vom Zielwert!
- ZU KURZE Antworten sind GENAUSO SCHLECHT wie zu lange!
- Nutze den verfügbaren Platz VOLLSTÄNDIG aus - das zeigt Gründlichkeit!
- ZÄHLE die Wörter beim Schreiben und passe die Länge an!

=== TEXTFORMAT (KRITISCH!) ===
- Schreibe KOHÄRENTE BLOCKTEXTE, keine unstrukturierten Textblöcke. Nutze immer Leerzeilen zur Trennung!
- Bulletpoints (mit - ) nur INNERHALB eines ausführlichen Abschnitts als Ergänzung, mit tiefgreifenden Erklärungen pro Punkt.
- Überschriften **fett** markieren. NIEMALS ganze Sätze oder Absätze komplett fett machen!
- Jeder Abschnitt muss einen klaren ROTEN FADEN haben.
- Vermeide abgehackte Sätze - schreibe fließend und verbindend

=== FRAGEN ===
${questionsList}

${extraContext ? `=== ZUSÄTZLICHER KONTEXT ===\n${extraContext}\n` : ''}

${ragContext ? `=== RELEVANTES WISSEN AUS DER WISSENSDATENBANK ===\n${ragContext}\n` : ''}`;

  // Apply Stage 1 enhancements: Add chapter-specific instructions, examples, and anti-phrases
  const prompt = enhancePrompt(basePrompt, chapterId, language === 'en' ? 'en' : 'de') + `

=== ANTWORT-FORMAT ===
Antworte AUSSCHLIESSLICH als gültiges JSON-Objekt. Jeder Key ist die Question-ID, jeder Value ist eine ausführliche Antwort (mindestens 100 Wörter pro Frage, außer bei kurzen Feldern wie Titel/Akronym).

Beispiel-Format:
{
  "question_id_1": "Ausführliche, professionelle Antwort mit konkreten Details...",
  "question_id_2": "Weitere ausführliche Antwort..."
}

${`WICHTIG: Alle Antworten in ${LANGUAGE_NAMES[language as Language] || language} verfassen!`}

Beginne DIREKT mit dem JSON-Objekt, kein einleitender Text.`;

  const systemContext = `Du bist ein erfahrener Erasmus+ Antragsschreiber. Du schreibst SACHLICH und NÜCHTERN wie ein professioneller Projektmanager.

⚠️⚠️⚠️ ZEICHEN- UND WORTLIMITS - HÖCHSTE PRIORITÄT! ⚠️⚠️⚠️
Du MUSST das Limit OPTIMAL ausnutzen (+/- 10-15%). Da KIs Zeichen schlecht schätzen, halte dich an die WÖRTER-Ziele:
- [MAX 3000 ZEICHEN] → Schreibe 380-420 Wörter (NICHT nur 200!)
- [MAX 2000 ZEICHEN] → Schreibe 250-280 Wörter (NICHT nur 150!)
- [MAX 1500 ZEICHEN] → Schreibe 180-210 Wörter
- [MAX 500 ZEICHEN] → Schreibe 60-70 Wörter
ZU KURZE Antworten werden als UNVOLLSTÄNDIG gewertet!

🚫🚫🚫 ABSOLUT VERBOTEN - SOFORTIGE DISQUALIFIKATION! 🚫🚫🚫
Diese Phrasen/Stile führen zur SOFORTIGEN ABLEHNUNG durch echte Gutachter:
- "gemäß dem Prinzip der..." / "nach dem Ansatz der..."
- "Wer hier spart, baut auf Sand" - KEINE Redewendungen/Sprichwörter!
- "Diese Summe ist entscheidend/kritisch/essentiell"
- "das von Gutachtern bevorzugt wird" - NIEMALS so schreiben!
- Erfundene Begriffe wie "Wasserfall-Logik", "Digital Gaps"
- Marketing-Sprache: "Game-Changer", "Best Practice", "State-of-the-Art", "Synergieeffekte"
- Leere Superlative: "von größter Bedeutung", "absolut notwendig", "entscheidend"
- Belehrende/anmaßende Aussagen über Gutachter oder EU-Programme
- Phrasen die KLUG klingen sollen aber inhaltsleer sind

✅ SO SCHREIBST DU RICHTIG (sachlich, konkret, professionell):
- "Das Budget von 30.000 EUR gliedert sich in: Personalkosten 15.000 EUR, Materialien 8.000 EUR, Reisekosten 7.000 EUR."
- "Partner A entwickelt das Curriculum basierend auf seiner 10-jährigen Erfahrung in der Erwachsenenbildung."
- "Die Bedarfsanalyse stützt sich auf eine Umfrage unter 200 Lehrenden (März 2024) und den DESI-Index 2023."

KRITISCHE FORMATIERUNGS-REGELN:
⚠️ SCHREIBE FLIESSTEXT, IMMER GETRENNT DURCH LEERZEILEN!
⚠️ Bulletpoints (mit - ) nur als ERGÄNZUNG, nie als Hauptinhalt, aber WENN genutzt, dann detailliert begründen.
⚠️ Jeder Text muss wie ein KOHÄRENTER AUFSATZ klingen.
⚠️ NIEMALS GANZE SÄTZE ODER ABSÄTZE IN **FETT** SCHREIBEN! Fett nur für Stichworte/Überschriften nutzen!
⚠️ WENN DIE FRAGE "Project Title" ODER "Project Acronym" BEINHALTET, MUSS DIE ANTWORT AUF ENGLISCH SEIN, EGAL WELCHE SPRACHE VORHER EINGESTELLT WAR!

QUALITÄTS-CHECK vor jeder Antwort:
☑️ Hat die Antwort die RICHTIGE LÄNGE? (Erreicht sie die geforderte Wortanzahl?)
☑️ Klingt es SACHLICH und PROFESSIONELL (nicht belehrend)?
☑️ Enthält es KEINE erfundenen Begriffe oder Pseudo-Methoden?
☑️ Sind Zahlen und Fakten KONKRET und überprüfbar?
☑️ Würde ein erfahrener Gutachter diesen Text ernst nehmen?`;

  try {
    const response = await callGeminiForPipeline(prompt, systemContext, 0.7);

    // Try to extract JSON - multiple approaches
    let jsonString = response;

    // Check for markdown code blocks first
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    }

    // Try to extract JSON object
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      // Clean the JSON string from control characters that break parsing
      let cleanedJson = jsonMatch[0]
        // Replace literal newlines inside strings with escaped newlines
        .replace(/[\r\n]+/g, '\\n')
        // Remove other control characters (except valid JSON whitespace)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Fix double-escaped newlines
        .replace(/\\\\n/g, '\\n')
        // Fix cases where \\n\\n becomes weird
        .replace(/\\n\\n/g, '\\n\\n');

      try {
        const parsed = JSON.parse(cleanedJson);
        console.log(`[generateSectionAnswers] Successfully parsed ${Object.keys(parsed).length} answers for section ${sectionId}`);
        return parsed;
      } catch (parseError: any) {
        // Second attempt: more aggressive cleaning
        console.warn(`[generateSectionAnswers] First parse failed, trying aggressive clean for ${sectionId}`);

        // Extract just the key-value pairs and rebuild
        const keyValueRegex = /"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
        const result: Record<string, string> = {};
        let match;

        while ((match = keyValueRegex.exec(jsonMatch[0])) !== null) {
          const key = match[1];
          // Unescape the value and clean it
          let value = match[2]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          result[key] = value;
        }

        if (Object.keys(result).length > 0) {
          console.log(`[generateSectionAnswers] Recovered ${Object.keys(result).length} answers via regex for section ${sectionId}`);
          return result;
        }

        throw parseError;
      }
    } else {
      console.error(`[generateSectionAnswers] No JSON found in response for section ${sectionId}`);
      console.log('Response preview:', response.substring(0, 500));

      // Third attempt: Try to build answers from the raw text if it looks like a list
      // This handles cases where AI doesn't return proper JSON
      const result: Record<string, string> = {};
      const questionIds = questionsList.match(/\[([^\]]+)\]/g);
      if (questionIds && questionIds.length > 0) {
        // Just return empty strings to allow manual editing
        for (const qid of questionIds) {
          const cleanId = qid.replace(/[\[\]]/g, '');
          result[cleanId] = response.length > 100 ? response.substring(0, 500) + '...' : response;
        }
        if (Object.keys(result).length > 0) {
          console.log(`[generateSectionAnswers] Created placeholder answers for ${Object.keys(result).length} questions in ${sectionId}`);
          return result;
        }
      }
    }
  } catch (e: any) {
    console.error(`[generateSectionAnswers] Error for section ${sectionId}:`, e.message);
  }

  return {};
}

// ============================================================================
// SINGLE QUESTION GENERATOR (for per-question regeneration)
// ============================================================================

/**
 * Generate or regenerate a single answer for a specific question
 * Used for per-question AI regeneration with optional custom instructions
 */
export async function generateSingleAnswer(
  state: PipelineState,
  questionId: string,
  chapterId: number,
  language: string,
  customInstruction?: string,
  originalConcept?: SavedConcept,
  snippets?: { title: string; content: string }[]
): Promise<AnswerData> {
  // Find the question in the official structure
  const actionType = state.configuration?.actionType || 'KA220';
  const structure = getOfficialPipelineStructure(actionType);
  const chapter = structure.find((c: any) => c.id === chapterId);
  if (!chapter) {
    console.error(`[generateSingleAnswer] Chapter ${chapterId} not found`);
    return { value: '', mode: 'ai', lastEditedAt: new Date().toISOString() };
  }

  let questionText = '';
  let sectionTitle = '';

  for (const section of chapter.sections) {
    const q = section.questions.find(q => q.id === questionId);
    if (q) {
      questionText = q.text;
      sectionTitle = section.title;
      break;
    }
  }

  if (!questionText) {
    console.error(`[generateSingleAnswer] Question ${questionId} not found in chapter ${chapterId}`);
    return { value: '', mode: 'ai', lastEditedAt: new Date().toISOString() };
  }

  // SPECIAL HANDLING: Chapter 2 - Participating Organisations
  // Generate descriptions for EACH partner - uses Knowledge Pool documents!
  if (chapterId === 2 && ['org_presentation', 'org_experience', 'org_past_participation'].includes(questionId)) {
    console.log(`[generateSingleAnswer] Generating partner descriptions for ${questionId}`);

    // DEBUG: Log the entire knowledge pool state
    console.log(`[generateSingleAnswer] ========== KNOWLEDGE POOL DEBUG ==========`);
    console.log(`[generateSingleAnswer] state.knowledgePool exists: ${!!state.knowledgePool}`);
    console.log(`[generateSingleAnswer] state.knowledgePool?.documents: ${state.knowledgePool?.documents?.length || 0}`);
    console.log(`[generateSingleAnswer] state.knowledgePool?.websites: ${state.knowledgePool?.websites?.length || 0}`);
    console.log(`[generateSingleAnswer] state.knowledgePool?.notes: ${state.knowledgePool?.notes?.length || 0}`);
    if (state.knowledgePool?.documents) {
      state.knowledgePool.documents.forEach((d, i) => {
        console.log(`[generateSingleAnswer]   Doc[${i}]: "${d.name}" status=${d.status} hasAiAnalysis=${!!d.aiAnalysis} projects=${d.aiAnalysis?.completedProjects?.length || 0}`);
      });
    }
    console.log(`[generateSingleAnswer] ==========================================`);

    // Get PROJECT-SPECIFIC knowledge pool context - THIS IS CRITICAL!
    const knowledgePoolContext = getKnowledgePoolContext(state.knowledgePool);
    console.log(`[generateSingleAnswer] Chapter 2 - Knowledge pool context: ${knowledgePoolContext ? 'YES (' + knowledgePoolContext.length + ' chars)' : 'NO/EMPTY'}`);

    // Get existing answer for context (CRITICAL: preserve previous work!)
    const existingAnswer = state.answers?.[questionId];
    const existingValue = typeof existingAnswer === 'object' && 'value' in existingAnswer
      ? existingAnswer.value
      : typeof existingAnswer === 'string' ? existingAnswer : '';

    const partnerDescriptions: string[] = [];

    for (const partner of state.consortium) {
      // Extract ALL available partner data with explicit null checks
      const partnerData = {
        name: partner.name || 'Unbekannt',
        country: partner.country || 'Unbekannt',
        type: partner.type || 'Nicht angegeben',
        role: partner.role || (partner.isLead ? 'Projektkoordinator' : 'Projektpartner'),
        isLead: partner.isLead || false,
        expertise: partner.expertise && partner.expertise.length > 0 ? partner.expertise : null,
        targetGroups: partner.targetGroups && partner.targetGroups.length > 0 ? partner.targetGroups : null,
        previousProjects: partner.previousProjects && partner.previousProjects.length > 0 ? partner.previousProjects : null,
        costPerDay: partner.costPerDay || null
      };

      // Build explicit data section showing what IS and what ISN'T available
      const dataAvailable: string[] = [];
      const dataMissing: string[] = [];

      dataAvailable.push(`Name: ${partnerData.name}`);
      dataAvailable.push(`Land: ${partnerData.country}`);
      dataAvailable.push(`Organisationstyp: ${partnerData.type}`);
      dataAvailable.push(`Rolle im Projekt: ${partnerData.role}`);

      if (partnerData.expertise) {
        dataAvailable.push(`Expertise-Bereiche: ${partnerData.expertise.join(', ')}`);
      } else {
        dataMissing.push('Expertise-Bereiche');
      }

      if (partnerData.targetGroups) {
        dataAvailable.push(`Zielgruppen: ${partnerData.targetGroups.join(', ')}`);
      } else {
        dataMissing.push('Zielgruppen');
      }

      if (partnerData.previousProjects) {
        dataAvailable.push(`Bisherige Projekte: ${partnerData.previousProjects.map(p => typeof p === 'string' ? p : `${p}`).join('; ')}`);
      } else {
        dataMissing.push('Bisherige Projekte');
      }

      if (partner.generatedDescriptions && partner.generatedDescriptions.length > 0) {
        dataAvailable.push(`KI-Profil der Organisation: ${partner.generatedDescriptions[0].content}`);
      }

      if (partner.uploadedDocuments && partner.uploadedDocuments.length > 0) {
        dataAvailable.push(`Dokumente der Organisation: ${partner.uploadedDocuments.map(d => {
          let docInfo = `${d.name} (${d.type})`;
          if (d.summary?.executiveSummary) {
            docInfo += `: ${d.summary.executiveSummary}`;
          }
          if (d.summary?.keyFindings && d.summary.keyFindings.length > 0) {
            docInfo += `. Wichtigste Erkenntnisse: ${d.summary.keyFindings.map(f => f.finding).join(', ')}`;
          }
          return docInfo;
        }).join('; ')}`);
      }

      // Find documents in knowledge pool that match this partner's name
      // Use flexible matching: partial name match, fuzzy match, etc.
      const allKnowledgeDocs = state.knowledgePool?.documents?.filter(d => d.status === 'ready') || [];
      console.log(`[generateSingleAnswer] Partner "${partnerData.name}" - Checking ${allKnowledgeDocs.length} knowledge pool docs`);

      // Log all docs for debugging
      allKnowledgeDocs.forEach(d => {
        console.log(`[generateSingleAnswer]   Doc: "${d.name}", org: "${d.aiAnalysis?.organizationName || 'N/A'}", projects: ${d.aiAnalysis?.completedProjects?.length || 0}`);
      });

      const partnerNameLower = partnerData.name.toLowerCase();
      const partnerNameParts = partnerNameLower.split(/\s+/); // Split into words for partial matching

      const partnerKnowledgeDocs = allKnowledgeDocs.filter(d => {
        const docNameLower = d.name.toLowerCase();
        const orgNameLower = (d.aiAnalysis?.organizationName || '').toLowerCase();

        // Exact or partial name match
        const nameInDocName = docNameLower.includes(partnerNameLower) || partnerNameLower.includes(docNameLower.replace(/[._-]/g, ' ').trim());
        const nameInOrgName = orgNameLower.includes(partnerNameLower) || partnerNameLower.includes(orgNameLower);

        // Partial word match (at least 2 significant words match)
        const significantPartnerWords = partnerNameParts.filter(w => w.length > 3);
        const docWords = `${docNameLower} ${orgNameLower}`.split(/\s+/);
        const wordMatches = significantPartnerWords.filter(pw => docWords.some(dw => dw.includes(pw) || pw.includes(dw)));
        const hasPartialMatch = wordMatches.length >= Math.min(2, significantPartnerWords.length);

        const isMatch = nameInDocName || nameInOrgName || hasPartialMatch;
        if (isMatch) {
          console.log(`[generateSingleAnswer]   ✅ MATCH: Doc "${d.name}" matches partner "${partnerData.name}"`);
        }
        return isMatch;
      });

      // If no specific match, use ALL knowledge pool docs (they might still be relevant)
      const docsToUse = partnerKnowledgeDocs.length > 0 ? partnerKnowledgeDocs : allKnowledgeDocs;
      console.log(`[generateSingleAnswer] Partner "${partnerData.name}": Using ${docsToUse.length} docs (matched: ${partnerKnowledgeDocs.length}, all: ${allKnowledgeDocs.length})`);


      // Add knowledge pool document data for this partner
      let partnerKnowledgeContext = '';
      if (docsToUse.length > 0) {
        partnerKnowledgeContext = '\n\n📚 HOCHGELADENE DOKUMENTE (PRIORITÄT - VERWENDE DIESE DATEN ZUERST!):\n';
        partnerKnowledgeContext += '='.repeat(70) + '\n';

        for (const doc of docsToUse) {
          partnerKnowledgeContext += `\n📄 ${doc.name}\n`;
          if (doc.aiAnalysis?.organizationName) {
            partnerKnowledgeContext += `   Organisation: ${doc.aiAnalysis.organizationName}\n`;
          }
          if (doc.aiAnalysis?.mission) {
            partnerKnowledgeContext += `   Mission: ${doc.aiAnalysis.mission}\n`;
          }
          if (doc.aiAnalysis?.staffSize) {
            partnerKnowledgeContext += `   Mitarbeitergröße: ${doc.aiAnalysis.staffSize}\n`;
          }
          if (doc.aiAnalysis?.competences && doc.aiAnalysis.competences.length > 0) {
            partnerKnowledgeContext += `   Kompetenzen: ${doc.aiAnalysis.competences.join(', ')}\n`;
          }
          if (doc.aiAnalysis?.targetGroups && doc.aiAnalysis.targetGroups.length > 0) {
            partnerKnowledgeContext += `   Zielgruppen: ${doc.aiAnalysis.targetGroups.join(', ')}\n`;
          }
          if (doc.aiAnalysis?.relevantSectors && doc.aiAnalysis.relevantSectors.length > 0) {
            partnerKnowledgeContext += `   Sektoren: ${doc.aiAnalysis.relevantSectors.join(', ')}\n`;
          }
          // CRITICAL: Include completed projects from knowledge pool documents!
          if (doc.aiAnalysis?.completedProjects && doc.aiAnalysis.completedProjects.length > 0) {
            partnerKnowledgeContext += `   🎯 BISHERIGE PROJEKTE (AUS DOKUMENT - DIESE VERWENDEN!):\n`;
            for (const proj of doc.aiAnalysis.completedProjects) {
              partnerKnowledgeContext += `     - ${proj.title} (${proj.role}, ${proj.programme}${proj.year ? ', ' + proj.year : ''}${proj.topic ? ' - ' + proj.topic : ''})\n`;
            }
          }
          if (doc.aiAnalysis?.statistics && doc.aiAnalysis.statistics.length > 0) {
            partnerKnowledgeContext += `   Statistiken:\n`;
            for (const stat of doc.aiAnalysis.statistics) {
              partnerKnowledgeContext += `     - ${stat.metric}: ${stat.context}\n`;
            }
          }
          if (doc.aiAnalysis?.recommendations && doc.aiAnalysis.recommendations.length > 0) {
            partnerKnowledgeContext += `   Empfehlungen: ${doc.aiAnalysis.recommendations.join('; ')}\n`;
          }
          if (doc.aiAnalysis?.usefulForProposal) {
            const useful = doc.aiAnalysis.usefulForProposal;
            if (useful.impact) partnerKnowledgeContext += `   Impact-Potenzial: ${useful.impact}\n`;
            if (useful.methodology) partnerKnowledgeContext += `   Methodische Stärken: ${useful.methodology}\n`;
            if (useful.dissemination) partnerKnowledgeContext += `   Verbreitungspotenzial: ${useful.dissemination}\n`;
          }
        }
        partnerKnowledgeContext += '='.repeat(70) + '\n';
      }

      // Extract existing description for this partner if available (to preserve previous edits)
      let existingPartnerText = '';
      if (existingValue) {
        // Try to find this partner's section in the existing answer
        const partnerSectionRegex = new RegExp(`## ${partnerData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^#]*(?=## |$)`, 'is');
        const match = existingValue.match(partnerSectionRegex);
        if (match) {
          existingPartnerText = match[0].trim();
        }
      }

      let partnerPrompt = '';
      const strictWarning = `
⚠️ WICHTIGE REGELN:
1. PRIORISIERE die "HOCHGELADENEN DOKUMENTE" - diese enthalten verifizierte Daten!
2. Wenn Dokumente Projekte listen, IST der Partner KEIN Newcomer!
3. Verwende konkrete Zahlen, Namen und Fakten aus den Dokumenten.
4. Erfinde KEINE zusätzlichen Details die nicht in den Daten stehen.
5. FORMATIERE mit Markdown: ## Überschriften, - Bullet Points, **fett** für wichtige Begriffe
`;

      // Add existing text context if we're improving
      const existingTextContext = existingPartnerText
        ? `\n\n=== BISHERIGER TEXT (VERBESSERE DIESEN, BEHALTE GUTE INHALTE!) ===\n${existingPartnerText}\n=== ENDE BISHERIGER TEXT ===\n`
        : '';

      // Add custom instruction if provided
      const instructionContext = customInstruction
        ? `\n\n🎯 BENUTZER-ANWEISUNG (FOLGE DIESER!):\n${customInstruction}\n`
        : '';

      if (questionId === 'org_presentation') {
        partnerPrompt = `${strictWarning}
${partnerKnowledgeContext}

AUFGABE: Schreibe eine ausführliche Organisationsvorstellung (700-1000 Wörter) für den EU-Förderantrag.

=== PARTNER-BASISDATEN ===
${dataAvailable.join('\n')}
${existingTextContext}
${instructionContext}

FRAGE: "${questionText}"

FORMATIERUNG & STRUKTUR:
Verwende diese Markdown-Struktur:

## Über die Organisation
[Kurze Einleitung]

## Arbeitsbereich und Expertise
- **Bereich 1**: Beschreibung
- **Bereich 2**: Beschreibung

## Zielgruppen und Reichweite
[Details mit Zahlen wenn verfügbar]

## Rolle im Konsortium
[Wie passt die Organisation zum Projekt]

WICHTIG:
- Wenn hochgeladene Dokumente vorhanden sind, verwende deren Daten PRIORITÄR!
- Integriere konkrete Fakten, Zahlen und Projekterfahrungen aus den Dokumenten.
${existingPartnerText ? '- Baue auf dem bisherigen Text auf und verbessere ihn gemäß der Anweisung.' : ''}

Schreibe in ${LANGUAGE_NAMES[language as Language] || language}.`;

      } else if (questionId === 'org_experience') {
        partnerPrompt = `${strictWarning}
${partnerKnowledgeContext}

AUFGABE: Beschreibe die relevante Erfahrung ausführlich (700-1000 Wörter) der Organisation.

=== PARTNER-BASISDATEN ===
${dataAvailable.join('\n')}

=== PROJEKT-KONTEXT ===
Projekttitel: ${state.projectTitle || state.idea.shortDescription}
Akronym: ${state.acronym || 'N/A'}
Aktionstyp: ${state.configuration?.actionType || 'KA220'}
Projektziel: ${state.idea.mainObjective}
${existingTextContext}
${instructionContext}

FORMATIERUNG & STRUKTUR:
Verwende diese Markdown-Struktur:

## Thematische Expertise
[Detaillierte Beschreibung der Fachbereiche]

## Projekterfahrung
- **Projektname 1**: Programm, Rolle, Jahr, Beschreibung
- **Projektname 2**: Programm, Rolle, Jahr, Beschreibung

## Methodische Kompetenz
[Konkrete methodische Ansätze und Werkzeuge]

## Beitrag zu diesem Projekt
[Wie wird die Erfahrung eingesetzt]

FRAGE: "${questionText}"

WICHTIG:
- Wenn "BISHERIGE PROJEKTE" in den Dokumenten gelistet sind, beschreibe diese KONKRET!
- KEIN Partner ist "Newcomer" wenn Projekte in den Dokumenten stehen!
- Verwende echte Projektnamen, Jahre und Details aus den Dokumenten.
${existingPartnerText ? '- Baue auf dem bisherigen Text auf und verbessere ihn gemäß der Anweisung.' : ''}

Schreibe in ${LANGUAGE_NAMES[language as Language] || language}.`;

      } else if (questionId === 'org_past_participation') {
        // Check if knowledge pool documents have projects for this partner
        const hasProjectsInKnowledge = docsToUse.some(d =>
          d.aiAnalysis?.completedProjects && d.aiAnalysis.completedProjects.length > 0
        );
        console.log(`[generateSingleAnswer] Partner "${partnerData.name}" - hasProjectsInKnowledge: ${hasProjectsInKnowledge}`);

        partnerPrompt = `${strictWarning}
${partnerKnowledgeContext}

AUFGABE: Beschreibe die bisherige EU-Programm-Beteiligung ausführlich (400-600 Wörter).

=== PARTNER-BASISDATEN ===
${dataAvailable.join('\n')}
${existingTextContext}
${instructionContext}

FRAGE: "${questionText}"

${hasProjectsInKnowledge || partnerData.previousProjects
            ? `WICHTIG: Die Organisation hat EU-Projekterfahrung! Beschreibe die konkreten Projekte.

FORMATIERUNG & STRUKTUR:
## Bisherige EU-Projekte
- **Projektname 1**: Programm, Rolle, Jahr, Ergebnisse
- **Projektname 2**: Programm, Rolle, Jahr, Ergebnisse

## Gewonnene Erkenntnisse
[Was wurde aus den Projekten gelernt]

## Übertragbarkeit auf dieses Projekt
[Wie wird die Erfahrung eingesetzt]`
            : `Die Organisation ist Newcomer ohne bisherige EU-Projekte.

FORMATIERUNG & STRUKTUR:
## Motivation für EU-Projekte
[Warum möchte die Organisation teilnehmen]

## Transferierbare Erfahrung
- **Erfahrung 1**: Beschreibung
- **Erfahrung 2**: Beschreibung

## Erwarteter Mehrwert
[Was bringt die Organisation ein]`}

${existingPartnerText ? 'Baue auf dem bisherigen Text auf und verbessere ihn gemäß der Anweisung.' : ''}

Schreibe in ${LANGUAGE_NAMES[language as Language] || language}.`;
      }

      const systemContext = `Du bist ein Erasmus+ Experte.
KRITISCH: Wenn hochgeladene Dokumente Projekte auflisten, verwende diese! Der Partner ist dann KEIN Newcomer!
FORMATIERE mit Markdown: ## Überschriften, - Bullet Points, **fett** für wichtige Begriffe.
Schreibe AUSFÜHRLICH und DETAILLIERT.
Verwende konkrete Fakten aus den Dokumenten. Bei fehlenden Infos formuliere allgemein.
${existingPartnerText ? 'Der Benutzer hat bereits einen Text geschrieben - baue darauf auf!' : ''}`;

      try {
        const response = await callGeminiForPipeline(partnerPrompt, systemContext, 0.4);
        partnerDescriptions.push(`## ${partnerData.name} (${partnerData.country}) - ${partnerData.role}\n\n${response.trim()}`);
        console.log(`[generateSingleAnswer] Generated description for ${partnerData.name} (${response.length} chars, knowledge docs: ${docsToUse.length})`);
      } catch (e: any) {
        console.error(`[generateSingleAnswer] Error generating for ${partnerData.name}:`, e.message);
        partnerDescriptions.push(`## ${partnerData.name} (${partnerData.country})\n\n*Beschreibung konnte nicht generiert werden.*`);
      }
    }

    const fullResponse = partnerDescriptions.join('\n\n---\n\n');

    return {
      value: fullResponse,
      mode: 'ai',
      lastEditedAt: new Date().toISOString()
    };
  }

  // Build context for standard questions
  const partnerList = state.consortium.map(p =>
    `${p.name} (${p.country})`
  ).join(', ');

  // Get RAG context - include uploaded studies from global vector store
  const ragQuery = `Erasmus+ ${sectionTitle} ${chapter.title} ${questionText}`;
  const ragContext = await getRAGContext(ragQuery);

  // Get PROJECT-SPECIFIC knowledge pool context (documents, websites, notes)
  const knowledgePoolContext = getKnowledgePoolContext(state.knowledgePool);
  console.log(`[generateSingleAnswer] Knowledge pool context: ${knowledgePoolContext ? 'Available (' + knowledgePoolContext.length + ' chars)' : 'None'}`);

  // Find existing answer for context
  const existingAnswer = state.answers?.[questionId];
  const existingValue = typeof existingAnswer === 'object' && 'value' in existingAnswer
    ? existingAnswer.value
    : typeof existingAnswer === 'string' ? existingAnswer : '';

  // Build prompt for single question
  const prompt = `Du bist ein erfahrener Erasmus+ Evaluator.
    PROJEKT-KONTEXT:
    Projekttitel: ${state.projectTitle || state.idea.shortDescription}
    Akronym: ${state.acronym || 'N/A'}
    Aktionstyp: ${state.configuration?.actionType || 'KA220'}
Sektor: ${state.idea.sector}
Partner: ${partnerList}
Hauptziel: ${state.idea.mainObjective}

=== FRAGE ===
Kapitel: ${chapter.title}
Abschnitt: ${sectionTitle}
Frage: "${questionText}"

${existingValue ? `=== BISHERIGE ANTWORT ===\n${existingValue}\n` : ''}

${customInstruction ? `=== BENUTZER-ANWEISUNG ===\n${customInstruction}\n` : ''}

${snippets && snippets.length > 0 ? `=== BEST-PRACTICE BEISPIELE (LASS DICH DAVON INSPIRIEREN) ===\n${snippets.map(s => `Beispiel "${s.title}":\n${s.content}`).join('\n\n')}\n` : ''}

${knowledgePoolContext ? knowledgePoolContext : ''}

${ragContext ? `=== WISSEN AUS STUDIEN/KNOWLEDGE BASE ===\n${ragContext}\n` : ''}

${originalConcept ? `
═══════════════════════════════════════════════════════════════
VERBINDLICHES KONZEPT — DER ANTRAG MUSS DIESEM ENTWURF FOLGEN
═══════════════════════════════════════════════════════════════

PROJEKT-METADATEN (BINDEND — NICHT ÄNDERN):
- Titel: ${originalConcept.title}
- Aktionstyp: ${state.configuration?.actionType || 'KA220'}
- Dauer: ${state.configuration?.duration || 24} Monate
- Budget: ${state.configuration?.totalBudget || 250000} EUR
- Partneranzahl: ${state.consortium?.length || 0} Organisationen
- Partnerländer: ${[...new Set(state.consortium?.map(p => p.country) || [])].join(', ')}

KONZEPT-INHALT:
Problem: ${originalConcept.problemStatement}
Innovation: ${originalConcept.innovation}
Erwarteter Impact: ${originalConcept.expectedImpact}
${originalConcept.detailedConcept ? `\nDetailliertes Konzept (WICHTIGSTE QUELLE — das gesamte Exposé):\n${originalConcept.detailedConcept}\n` : ''}
Verwendete Quellen/Studien aus Recherche:
${originalConcept.studyReferences?.map(s => `- ${s.title} (${s.url || 'Keine URL'}): ${s.snippet || ''}`).join('\n') || 'Keine spezifischen Quellen'}
${originalConcept.objectives && originalConcept.objectives.length > 0 ? `
SMART-Ziele aus Konzeptentwicklung (MÜSSEN in die Antwort einfließen wenn thematisch relevant):
${originalConcept.objectives.map((o, i) => `- SO${i + 1}: ${o.text}${o.indicators?.length ? ` (Indikatoren: ${o.indicators.join('; ')})` : ''}${o.erasmusPriority ? ` [Priorität: ${o.erasmusPriority}]` : ''}`).join('\n')}` : ''}
${(originalConcept as any).starsData ? `
=== STARS EXPOSÉ DATEN (DETAILLIERTE PROJEKT-STRUKTUR) ===
${(originalConcept as any).starsData.challengeNarrative ? `Challenge-Narrativ:\n${(originalConcept as any).starsData.challengeNarrative}\n` : ''}
${(originalConcept as any).starsData.opportunityNarrative ? `Opportunity-Narrativ:\n${(originalConcept as any).starsData.opportunityNarrative}\n` : ''}
${(originalConcept as any).starsData.projectResponse ? `Projekt-Antwort:\n${(originalConcept as any).starsData.projectResponse}\n` : ''}
${(originalConcept as any).starsData.goals?.length > 0 ? `Projektziele mit Rationale:\n${(originalConcept as any).starsData.goals.map((g: any) => `- G${g.number}: ${g.statement}\n  Rationale: ${g.rationale}\n  Messbar: ${g.measurableOutcome}`).join('\n')}\n` : ''}
${(originalConcept as any).starsData.starsTargetGroups?.length > 0 ? `Zielgruppen-Hierarchie:\n${(originalConcept as any).starsData.starsTargetGroups.map((tg: any) => `- ${tg.level}: ${tg.name} — ${tg.description} (Reichweite: ${tg.estimatedReach})`).join('\n')}\n` : ''}
${(originalConcept as any).starsData.methodPrinciples?.length > 0 ? `Methodologische Prinzipien:\n${(originalConcept as any).starsData.methodPrinciples.map((mp: any) => `- ${mp.name}: ${mp.description}`).join('\n')}\n` : ''}
${(originalConcept as any).starsData.partnershipNarrative ? `Partnerschafts-Narrativ:\n${(originalConcept as any).starsData.partnershipNarrative}\n` : ''}
=== ENDE STARS DATEN ===` : ''}

═══════════════════════════════════════════════════════════════
ABSOLUTE BINDUNGSREGELN FÜR DEN GENERATOR:
1. Dein Antrag ist eine AUSFORMULIERUNG des obigen Konzepts — KEIN neuer Entwurf.
2. ALLE Zahlen (Teilnehmer, Länder, Dauer, Budget) MÜSSEN mit dem Konzept übereinstimmen.
3. ERFINDE KEINE neuen Ziele, Zielgruppen, Partner oder Aktivitäten die nicht im Konzept stehen.
4. Wenn das Konzept "60 Lehrkräfte" sagt, schreibe "60 Lehrkräfte" — nicht 75, nicht 100.
5. Wenn das Konzept "${state.configuration?.duration || 24} Monate" sagt, schreibe "${state.configuration?.duration || 24} Monate".
6. Referenziere NUR die ${state.consortium?.length || 0} Partnerländer: ${[...new Set(state.consortium?.map(p => p.country) || [])].join(', ')}.
7. Das Konzept wurde bereits mit Partnern abgestimmt. Abweichungen zerstören das Vertrauen.
═══════════════════════════════════════════════════════════════
` : ''}

=== ANTWORT-FORMAT & LÄNGEN-VORGABEN (KRITIKALITÄT: HOCH) ===
Schreibe eine professionelle, überzeugende Antwort (ca. 400-600 Wörter / 3000-4000 Zeichen).
- ZWINGEND: Unterschreite diese Länge nicht, Erasmus+ Gutachter verlangen Detailtiefe!
- Konkrete Beispiele und Zahlen verwenden
- Erasmus+ Terminologie nutzen
- Keine Floskeln, nur substanzielle Aussagen
${knowledgePoolContext ? '- Integriere relevante Informationen aus der Projekt-Wissensdatenbank!' : ''}

=== FORMATIERUNG (WICHTIG!) ===
Nutze IMMER sauberes Markdown für gute Lesbarkeit:
- **### Überschriften** (H3) für Hauptabschnitte (NICHT ## H2 verwenden!)
- **#### Unterüberschriften** (H4) für Teilbereiche
- **Bullet Points** mit - für Aufzählungen (max. 3-4 Punkte pro Liste)
- **Fett** NUR für Schlüsselbegriffe (sparsam einsetzen, nicht ganze Sätze fetten!)
- Strukturiere in kurze, gut lesbare Absätze (max. 3-4 Sätze pro Absatz)
- Trenne Sinnabschnitte klar voneinander

${`Antwort in ${LANGUAGE_NAMES[language as Language] || language}:`}`;

  const systemContext = `Du bist ein hochpräziser Erasmus+ Experte.
REGEL 1: Halte dich AUSSCHLIESSLICH an die Fakten aus dem "URSPRÜNGLICHEN KONZEPT". Erfinde KEINE neuen Aktivitäten, Partner, Ergebnisse oder Zielgruppen, die dort nicht erwähnt sind!
REGEL 2: Wenn Details fehlen, beschreibe den Ansatz generisch, aber logisch passend zur Konzept-Innovation.
REGEL 3: Integriere Wissen aus der Projekt-Wissensdatenbank organisch.

WICHTIGE LOGIK- UND WORTWAHL-REGELN (ÜBERALL ANWENDEN):
- INKLUSIVES WORDING: Nutze "Europa" oder "europäisch" anstelle von "EU" (z.B. "European workforce" statt "EU workforce"), da auch assoziierte Nicht-EU-Länder (z.B. Serbien) beteiligt sind.
- KEINE BUZZWORDS: Ersetze leere Begriffe wie "AI-based learning companion" durch konkrete, machbare technische Ansätze (z.B. "Web-basierte Applikation mit Anbindung an existierende LLM-APIs").
- VERMEIDE FLASCHENHÄLSE (Bottlenecks): Work Packages und Projektphasen müssen parallel oder leicht überlappend stattfinden (z.B. Entwicklung startet bereits mit Zwischenergebnissen der Analyse).
- TRAIN-THE-TRAINER: Wenn Pädagogen/Trainer ausgebildet werden, mache explizit deutlich, dass sie diese Tools danach in Pilottests mit ihren eigenen Lernenden erproben. Der Transfer in die Praxis muss klar sein.

WICHTIG: Formatiere IMMER mit extrem sauberem Markdown:
- **### Überschriften** (H3) für Hauptabschnitte (NICHT ## H2 verwenden!)
- **#### Unterüberschriften** (H4) für Details
- Bullet Points mit - für konkrete Aufzählungen
- **Fett** NUR für Schlüsselbegriffe (sparsam, nie ganze Sätze!)
- ERFINDE KEINE neuen Details, die nicht im Konzept oder den Quellen stehen!
- Mindestens 2-3 strukturierte Abschnitte pro Antwort.

🔴 LÄNGEN-VORGABEN: Generiere Antworten im Bereich von 2000-3500 Zeichen (ca. 300-500 Wörter). Qualität und Faktentreue sind wichtiger als bloße Textmasse!`;

  try {
    const response = await callGeminiForPipeline(prompt, systemContext, 0.7);

    // Clean up the response (remove any JSON wrapper if present)
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('{') || cleanResponse.startsWith('[')) {
      // Try to extract just the text value
      try {
        const parsed = JSON.parse(cleanResponse);
        cleanResponse = typeof parsed === 'string' ? parsed : parsed[questionId] || cleanResponse;
      } catch {
        // Not JSON, use as-is
      }
    }

    console.log(`[generateSingleAnswer] Generated answer for ${questionId} (${cleanResponse.length} chars)`);

    // Extract sources from RAG context if available
    const sources: string[] = [];
    if (ragContext) {
      // Simple source extraction - could be improved
      const sourceMatches = ragContext.match(/Quelle:\s*([^\n]+)/g);
      if (sourceMatches) {
        sources.push(...sourceMatches.map(s => s.replace('Quelle:', '').trim()));
      }
    }

    return {
      value: cleanResponse,
      mode: 'ai',
      sources: sources.length > 0 ? sources : undefined,
      lastEditedAt: new Date().toISOString()
    };
  } catch (e: any) {
    console.error(`[generateSingleAnswer] Error:`, e.message);
    return { value: '', mode: 'ai', lastEditedAt: new Date().toISOString() };
  }
}

// ============================================================================
// PARTNER-SPECIFIC GENERATION (for Step 2 per-partner questions)
// ============================================================================

/**
 * Generate answer for a single partner question using ALL available CRM data
 * IMPORTANT: Uses documents, summaries, and descriptions from Partner-Kartei!
 *
 * Target: 400-700 words per answer (not more!)
 */
export async function generateSinglePartnerAnswer(
  state: PipelineState,
  partner: ConsortiumPartner,
  baseQuestionId: string,
  chapterId: number,
  language: string,
  instruction?: string,
  snippets?: { title: string; content: string }[]
): Promise<AnswerData> {
  console.log(`[generateSinglePartnerAnswer] Generating ${baseQuestionId} for ${partner.name}`);

  // ========================================================================
  // STEP 1: Extract ALL partner data - including documents and summaries!
  // ========================================================================

  const partnerData = {
    name: partner.name || 'Unbekannt',
    country: partner.country || 'Unbekannt',
    type: partner.type || 'Nicht angegeben',
    role: partner.role || (partner.isLead ? 'Projektkoordinator' : 'Projektpartner'),
    isLead: partner.isLead || false,
    expertise: partner.expertise && partner.expertise.length > 0 ? partner.expertise : null,
    targetGroups: partner.targetGroups && partner.targetGroups.length > 0 ? partner.targetGroups : null,
    previousProjects: partner.previousProjects && partner.previousProjects.length > 0 ? partner.previousProjects : null,
  };

  // ========================================================================
  // STEP 2: Build RICH context from CRM data (documents, descriptions, etc.)
  // ========================================================================

  let richPartnerContext = `=== PARTNER: ${partnerData.name} (${partnerData.country}) ===\n`;
  richPartnerContext += `Organisationstyp: ${partnerData.type}\n`;
  richPartnerContext += `Rolle im Projekt: ${partnerData.role}\n\n`;

  // Add expertise
  if (partnerData.expertise) {
    richPartnerContext += `EXPERTISE-BEREICHE:\n${partnerData.expertise.map(e => `• ${e}`).join('\n')}\n\n`;
  }

  // Add target groups
  if (partnerData.targetGroups) {
    richPartnerContext += `ZIELGRUPPEN:\n${partnerData.targetGroups.map(t => `• ${t}`).join('\n')}\n\n`;
  }

  // Add previous projects with DETAILS
  if (partnerData.previousProjects && partnerData.previousProjects.length > 0) {
    richPartnerContext += `BISHERIGE PROJEKTE (ECHTE ERFAHRUNG!):\n`;
    for (const proj of partnerData.previousProjects) {
      if (typeof proj === 'string') {
        richPartnerContext += `• ${proj}\n`;
      } else {
        richPartnerContext += `• ${proj.title || proj.name || 'Projekt'}`;
        if (proj.programme) richPartnerContext += ` (${proj.programme})`;
        if (proj.role) richPartnerContext += ` - Rolle: ${proj.role}`;
        if (proj.year) richPartnerContext += ` - Jahr: ${proj.year}`;
        if (proj.description) richPartnerContext += `\n  Beschreibung: ${proj.description}`;
        richPartnerContext += '\n';
      }
    }
    richPartnerContext += '\n';
  } else {
    richPartnerContext += `ERFAHRUNG: Newcomer (keine dokumentierten EU-Projekte)\n\n`;
  }

  // ========================================================================
  // CRITICAL: Add generated descriptions from Partner-Kartei
  // ========================================================================
  if (partner.generatedDescriptions && partner.generatedDescriptions.length > 0) {
    richPartnerContext += `=== KI-GENERIERTE BESCHREIBUNGEN AUS DER PARTNER-KARTEI ===\n`;
    for (const desc of partner.generatedDescriptions) {
      richPartnerContext += `[${desc.title}]\n${desc.content}\n\n`;
    }
  }

  // ========================================================================
  // CRITICAL: Add uploaded document summaries - THIS IS THE KEY DATA!
  // ========================================================================
  if (partner.uploadedDocuments && partner.uploadedDocuments.length > 0) {
    richPartnerContext += `=== DOKUMENTIERTE NACHWEISE & STUDIEN ===\n`;
    richPartnerContext += `(NUTZE DIESE FAKTEN für authentische, nicht-generische Texte!)\n\n`;

    for (const doc of partner.uploadedDocuments) {
      richPartnerContext += `--- Dokument: ${doc.name} (${doc.type}) ---\n`;

      if (doc.summary) {
        if (doc.summary.executiveSummary) {
          richPartnerContext += `Zusammenfassung: ${doc.summary.executiveSummary}\n`;
        }

        // Key findings - CRUCIAL for credibility!
        if (doc.summary.keyFindings && doc.summary.keyFindings.length > 0) {
          richPartnerContext += `Wichtigste Erkenntnisse:\n`;
          for (const finding of doc.summary.keyFindings.slice(0, 5)) {
            richPartnerContext += `  ✓ ${finding.topic}: ${finding.finding}\n`;
          }
        }

        // Methodology - shows methodological competence
        if (doc.summary.methodology) {
          richPartnerContext += `Methodischer Ansatz: ${doc.summary.methodology}\n`;
        }

        // Recommendations from documents
        if (doc.summary.recommendations && doc.summary.recommendations.length > 0) {
          richPartnerContext += `Empfehlungen aus dem Dokument:\n`;
          for (const rec of doc.summary.recommendations.slice(0, 3)) {
            richPartnerContext += `  → ${rec}\n`;
          }
        }

        // Key terms/themes
        if (doc.summary.keyTerms && doc.summary.keyTerms.length > 0) {
          richPartnerContext += `Themenfelder: ${doc.summary.keyTerms.join(', ')}\n`;
        }
      } else if (doc.description) {
        richPartnerContext += `Beschreibung: ${doc.description}\n`;
      }
      richPartnerContext += '\n';
    }
  }

  // ========================================================================
  // STEP 2b: Add PROJECT KNOWLEDGE POOL documents!
  // This is CRITICAL - documents uploaded to the project's knowledge pool
  // ========================================================================
  console.log(`[generateSinglePartnerAnswer] Checking knowledge pool: ${state.knowledgePool?.documents?.length || 0} docs`);

  const allKnowledgeDocs = state.knowledgePool?.documents?.filter(d => d.status === 'ready') || [];

  if (allKnowledgeDocs.length > 0) {
    // Try to find docs that match this partner's name
    const partnerNameLower = partnerData.name.toLowerCase();
    const partnerNameParts = partnerNameLower.split(/\s+/).filter(w => w.length > 3);

    const matchingDocs = allKnowledgeDocs.filter(d => {
      const docNameLower = d.name.toLowerCase();
      const orgNameLower = (d.aiAnalysis?.organizationName || '').toLowerCase();

      const nameInDocName = docNameLower.includes(partnerNameLower) || partnerNameLower.includes(docNameLower.replace(/[._-]/g, ' ').trim());
      const nameInOrgName = orgNameLower.includes(partnerNameLower) || partnerNameLower.includes(orgNameLower);

      const docWords = `${docNameLower} ${orgNameLower}`.split(/\s+/);
      const wordMatches = partnerNameParts.filter(pw => docWords.some(dw => dw.includes(pw) || pw.includes(dw)));
      const hasPartialMatch = wordMatches.length >= Math.min(2, partnerNameParts.length);

      return nameInDocName || nameInOrgName || hasPartialMatch;
    });

    // Use matching docs or ALL docs if no specific match
    const docsToUse = matchingDocs.length > 0 ? matchingDocs : allKnowledgeDocs;
    console.log(`[generateSinglePartnerAnswer] Partner "${partnerData.name}": Using ${docsToUse.length} knowledge pool docs`);

    richPartnerContext += `\n=== 📚 PROJEKT-WISSENSDATENBANK (PRIORITÄT!) ===\n`;
    richPartnerContext += `Diese Dokumente wurden für das Projekt hochgeladen. VERWENDE DIESE DATEN PRIORITÄR!\n\n`;

    for (const doc of docsToUse) {
      richPartnerContext += `--- Dokument: ${doc.name} ---\n`;

      if (doc.aiAnalysis?.organizationName) {
        richPartnerContext += `Organisation: ${doc.aiAnalysis.organizationName}\n`;
      }
      if (doc.aiAnalysis?.mission) {
        richPartnerContext += `Mission: ${doc.aiAnalysis.mission}\n`;
      }
      if (doc.aiAnalysis?.staffSize) {
        richPartnerContext += `Mitarbeitergröße: ${doc.aiAnalysis.staffSize}\n`;
      }
      if (doc.aiAnalysis?.competences && doc.aiAnalysis.competences.length > 0) {
        richPartnerContext += `Kompetenzen: ${doc.aiAnalysis.competences.join(', ')}\n`;
      }
      if (doc.aiAnalysis?.targetGroups && doc.aiAnalysis.targetGroups.length > 0) {
        richPartnerContext += `Zielgruppen: ${doc.aiAnalysis.targetGroups.join(', ')}\n`;
      }

      // CRITICAL: Completed projects from knowledge pool!
      if (doc.aiAnalysis?.completedProjects && doc.aiAnalysis.completedProjects.length > 0) {
        richPartnerContext += `🎯 BISHERIGE PROJEKTE (DIESE VERWENDEN - PARTNER IST KEIN NEWCOMER!):\n`;
        for (const proj of doc.aiAnalysis.completedProjects) {
          richPartnerContext += `  • ${proj.title} (${proj.role}, ${proj.programme}${proj.year ? ', ' + proj.year : ''})\n`;
        }
      }

      if (doc.aiAnalysis?.statistics && doc.aiAnalysis.statistics.length > 0) {
        richPartnerContext += `Statistiken/Kennzahlen:\n`;
        for (const stat of doc.aiAnalysis.statistics) {
          richPartnerContext += `  • ${stat.metric}: ${stat.context}\n`;
        }
      }

      if (doc.aiAnalysis?.recommendations && doc.aiAnalysis.recommendations.length > 0) {
        richPartnerContext += `Empfehlungen: ${doc.aiAnalysis.recommendations.slice(0, 3).join('; ')}\n`;
      }

      if (doc.summary) {
        richPartnerContext += `Zusammenfassung: ${doc.summary}\n`;
      }

      richPartnerContext += '\n';
    }

    richPartnerContext += `=== ENDE WISSENSDATENBANK ===\n\n`;
  }

  // Get existing answer for context (to preserve previous work when improving)
  const existingAnswer = state.answers?.[`${partner.id}_${baseQuestionId}`];
  const existingValue = typeof existingAnswer === 'object' && 'value' in existingAnswer
    ? existingAnswer.value
    : typeof existingAnswer === 'string' ? existingAnswer : '';

  // ========================================================================
  // STEP 3: Build the prompt based on question type
  // ========================================================================

  const questionTexts: Record<string, { de: string; en: string }> = {
    org_presentation: {
      de: 'Bitte stellen Sie die Organisation kurz vor (z.B. Art, Arbeitsbereich, Tätigkeitsfelder).',
      en: 'Please briefly present the organisation (e.g. its type, scope of work, areas of activity).'
    },
    org_experience: {
      de: 'Was sind die Aktivitäten und Erfahrungen der Organisation in den für dieses Projekt relevanten Bereichen?',
      en: 'What are the activities and experience of the organisation in the areas relevant for this project?'
    },
    org_past_participation: {
      de: 'Möchten Sie Kommentare zur bisherigen Teilnahme Ihrer Organisation hinzufügen?',
      en: "Would you like to add any information to the summary of your organisation's past participation?"
    }
  };

  const questionText = language === 'de'
    ? questionTexts[baseQuestionId]?.de || baseQuestionId
    : questionTexts[baseQuestionId]?.en || baseQuestionId;

  // Check if knowledge pool has projects (to determine newcomer status correctly)
  const hasProjectsInKnowledge = allKnowledgeDocs.some(d =>
    d.aiAnalysis?.completedProjects && d.aiAnalysis.completedProjects.length > 0
  );
  console.log(`[generateSinglePartnerAnswer] hasProjectsInKnowledge: ${hasProjectsInKnowledge}`);

  // Project context
  const projectContext = `
=== PROJEKT-KONTEXT (BINDEND) ===
Projekttitel: ${state.projectTitle || state.idea.shortDescription}
Akronym: ${state.acronym || 'N/A'}
Aktionstyp: ${state.configuration?.actionType || 'KA220'}
Dauer: ${state.configuration?.duration || 24} Monate
Budget: ${state.configuration?.totalBudget || 250000} EUR
Sektor: ${state.idea.sector}
Partner: ${state.consortium?.length || 0} Organisationen aus ${[...new Set(state.consortium?.map(p => p.country) || [])].join(', ')}
Hauptziel: ${state.idea.mainObjective}
${state.originalConcept ? `
Konzept-Innovation: ${state.originalConcept.innovation}
Problemstellung: ${state.originalConcept.problemStatement}
${state.originalConcept.detailedConcept ? `Detailliertes Konzept (WICHTIGSTE QUELLE):\n${state.originalConcept.detailedConcept}\n` : ''}
${(state.originalConcept as any).starsData?.methodPrinciples?.length > 0 ? `Methodologische Prinzipien:\n${(state.originalConcept as any).starsData.methodPrinciples.map((mp: any) => `- ${mp.name}: ${mp.description}`).join('\n')}\n` : ''}
WICHTIG: Alle Zahlen, Zielgruppen und Aktivitäten MÜSSEN mit dem Konzept übereinstimmen. Nichts erfinden!` : ''}`;

  // Existing text context (for improvements)
  const existingTextContext = existingValue
    ? `\n=== BISHERIGER TEXT (VERBESSERE DIESEN!) ===\n${existingValue}\n=== ENDE BISHERIGER TEXT ===\n`
    : '';

  // Instruction context
  const instructionContext = instruction
    ? `\n🎯 BENUTZER-ANWEISUNG: ${instruction}\n`
    : '';

  // Snippets context
  const snippetsContext = snippets && snippets.length > 0
    ? `\n=== BEST-PRACTICE BEISPIELE (LASS DICH DAVON INSPIRIEREN) ===\n${snippets.map(s => `Beispiel "${s.title}":\n${s.content}`).join('\n\n')}\n`
    : '';

  // Build question-specific prompt
  let prompt = '';

  if (baseQuestionId === 'org_presentation') {
    prompt = `Du schreibst eine Organisationsvorstellung für einen EU-Förderantrag.

${richPartnerContext}
${projectContext}
${existingTextContext}
${instructionContext}
${snippetsContext}

FRAGE: "${questionText}"

AUFGABE: Schreibe eine professionelle, ausführliche Organisationsvorstellung (600-900 Wörter).

WICHTIGE REGELN:
1. PRIORISIERE die Projekt-Wissensdatenbank oben - diese enthält verifizierte Daten!
2. ${hasProjectsInKnowledge ? 'ACHTUNG: Es gibt Projekte in den Dokumenten - der Partner ist KEIN Newcomer!' : ''}
3. Verweise auf ECHTE Erfahrungen und Projekte (wenn vorhanden)
4. Erkläre, wie die Expertise zum aktuellen Projekt passt
${existingValue ? '5. Baue auf dem bisherigen Text auf und verbessere ihn!' : ''}
${instruction ? '6. Folge der Benutzer-Anweisung!' : ''}

FORMATIERUNG - WICHTIG:
- Schreibe zusammenhängenden FLIESSTEXT, KEINE Markdown-Überschriften (##, ###)!
- Strukturiere mit klaren Absätzen (Leerzeilen zwischen Themenblöcken)
- Verwende **fett** NUR für einzelne wichtige Begriffe (max 2-3 Wörter pro Fettung)
- Für Aufzählungen von Projekten/Kompetenzen verwende Spiegelstriche (-)

INHALTLICHE STRUKTUR (als Absätze, NICHT als Überschriften):
1. Absatz: Kurze Einleitung zur Organisation
2. Absatz: Arbeitsbereich und Expertise
3. Absatz: Zielgruppen und Reichweite (mit Zahlen wenn verfügbar)
4. Absatz: Rolle im aktuellen Projekt

Schreibe in ${LANGUAGE_NAMES[language as Language] || language}.`;

  } else if (baseQuestionId === 'org_experience') {
    prompt = `Du beschreibst die relevante Erfahrung einer Organisation für einen EU-Förderantrag.

${richPartnerContext}
${projectContext}
${existingTextContext}
${instructionContext}
${snippetsContext}

FRAGE: "${questionText}"

AUFGABE: Beschreibe die relevante Erfahrung ausführlich und detailliert (600-900 Wörter).

WICHTIGE REGELN:
1. PRIORISIERE die Projekt-Wissensdatenbank - dort stehen verifizierte Projekte!
2. ${hasProjectsInKnowledge ? 'ACHTUNG: Es gibt EU-Projekte in den Dokumenten - beschreibe DIESE konkret!' : 'Bei Newcomern: Transferierbare Erfahrungen aus dem Kerngeschäft'}
3. Zeige die DIREKTE Verbindung zur Projekt-Innovation
4. KEINE erfundenen Projektnamen oder Jahreszahlen!
${existingValue ? '5. Baue auf dem bisherigen Text auf und verbessere ihn!' : ''}
${instruction ? '6. Folge der Benutzer-Anweisung!' : ''}

FORMATIERUNG - WICHTIG:
- Schreibe zusammenhängenden FLIESSTEXT, KEINE Markdown-Überschriften (##, ###)!
- Strukturiere mit klaren Absätzen (Leerzeilen zwischen Themenblöcken)
- Verwende **fett** NUR für Projektnamen (max 2-3 Wörter pro Fettung)
- Für Projektlisten verwende Spiegelstriche (-)

INHALTLICHE STRUKTUR (als Absätze, NICHT als Überschriften):
1. Absatz: Thematische Expertise und Fachbereiche
2. Absatz: ${hasProjectsInKnowledge ? 'EU-Projekterfahrung mit konkreten Projekten' : 'Relevante Erfahrung aus dem Kerngeschäft'}
   - Bei Projekten: Liste mit Spiegelstrichen
3. Absatz: Methodische Kompetenz
4. Absatz: Beitrag zu diesem Projekt

Schreibe in ${LANGUAGE_NAMES[language as Language] || language}.`;

  } else if (baseQuestionId === 'org_past_participation') {
    prompt = `Du ergänzt Informationen zur bisherigen EU-Programm-Beteiligung.

${richPartnerContext}
${projectContext}
${existingTextContext}
${instructionContext}
${snippetsContext}

FRAGE: "${questionText}"

AUFGABE: Beschreibe die bisherige EU-Beteiligung detailliert (300-500 Wörter).

${hasProjectsInKnowledge || partnerData.previousProjects ?
        'Fokussiere auf die dokumentierten EU-Projekte und deren Lernerfahrungen.' :
        'Da es sich um einen NEWCOMER handelt: Beschreibe Motivation und transferierbare Erfahrungen.'}

FORMATIERUNG - WICHTIG:
- Schreibe zusammenhängenden FLIESSTEXT, KEINE Markdown-Überschriften (##, ###)!
- Strukturiere mit klaren Absätzen
- Verwende **fett** NUR für Projektnamen
- Für Projektlisten verwende Spiegelstriche (-)

${hasProjectsInKnowledge || partnerData.previousProjects ? `
INHALTLICHE STRUKTUR (als Absätze):
1. Absatz: Bisherige EU-Projekte als Liste mit Spiegelstrichen
2. Absatz: Gewonnene Erkenntnisse
3. Absatz: Übertragbarkeit auf dieses Projekt
` : `
INHALTLICHE STRUKTUR (als Absätze):
1. Absatz: Motivation für EU-Projekte
2. Absatz: Transferierbare Erfahrungen (als Liste)
3. Absatz: Erwarteter Mehrwert
`}

KEINE erfundenen Details! Schreibe in ${LANGUAGE_NAMES[language as Language] || language}.`;
  }

  // System context for AI
  const systemContext = `Du bist ein Erasmus+ Experte und schreibst Partnerbeschreibungen für echte Förderanträge.

⚠️ ANTI-HALLUZINATIONS-REGEL (ABSOLUT VERBINDLICH):
Du darfst NIEMALS organisationsspezifische Fakten erfinden. Das bedeutet:
- KEINE erfundenen Projektnamen, Akronyme oder Projektnummern
- KEINE erfundenen Jahreszahlen, Statistiken, Kennzahlen oder Mitarbeiterzahlen
- KEINE erfundenen Programmnamen (z.B. "Erasmus+ KA2", "Horizon 2020") wenn diese nicht in den Daten stehen
- KEINE erfundenen Kooperationspartner oder geographische Details die nicht belegt sind
- Wenn du dir bei einer Information nicht sicher bist: LASS SIE WEG oder formuliere allgemein ("die Organisation hat Erfahrung in...")

WICHTIGE LOGIK- UND WORTWAHL-REGELN:
- INKLUSIVES WORDING: Nutze grundsätzlich "Europa" oder "europäisch" anstelle von "EU", da bei Erasmus+ auch Assoziierte Nicht-EU-Länder (wie z.B. Serbien, Türkei, Nordmazedonien) voll beteiligt sind.
- KEINE BUZZWORDS: Beschreibe technische oder methodische Expertise konkret und nachvollziehbar (welche Technologien/Ansätze genau?) anstatt leere Buzzwords zu verwenden.

ZWEI KATEGORIEN FÜR DEINEN TEXT:
1. ✅ VERIFIZIERTE DATEN: Alles in "PARTNER:", "BISHERIGE PROJEKTE", "KI-GENERIERTE BESCHREIBUNGEN", "DOKUMENTIERTE NACHWEISE", "PROJEKT-WISSENSDATENBANK" → Diese Daten 1:1 verwenden und konkret benennen
2. 💭 ERLAUBTE SCHLUSSFOLGERUNGEN: Allgemeine Formulierungen über Kompetenzen, Motivation, Themenrelevanz basierend auf Expertisefeldern und Zielgruppen → Ohne erfundene Spezifika

${hasProjectsInKnowledge ? '✅ HINWEIS: Es gibt EU-Projekte in den Dokumenten - beschreibe DIESE konkret!' : '⚠️ HINWEIS: Keine EU-Projekte in den Dokumenten - keine Projekte erfinden!'}

FORMATIERUNG:
- Schreibe FLIESSTEXT, KEINE ## oder ### Überschriften!
- Verwende **fett** nur für einzelne Begriffe/Projektnamen
- Strukturiere mit Absätzen (Leerzeilen)
- Aufzählungen mit Spiegelstrichen (-)
- Schreibe AUSFÜHRLICH (600-900 Wörter für Haupt-Fragen)
${existingValue ? '- Der Benutzer hat bereits Text - BAUE DARAUF AUF!' : ''}
${instruction ? '- Folge der BENUTZER-ANWEISUNG!' : ''}

Schreibe in ${LANGUAGE_NAMES[language as Language] || language}.`;

  try {
    const response = await callGeminiForPipeline(prompt, systemContext, 0.5);
    console.log(`[generateSinglePartnerAnswer] Generated for ${partnerData.name} (${response.length} chars)`);

    return {
      value: response.trim(),
      mode: 'ai',
      lastEditedAt: new Date().toISOString()
    };
  } catch (e: any) {
    console.error(`[generateSinglePartnerAnswer] Error:`, e.message);
    return {
      value: language === 'de'
        ? '*Antwort konnte nicht generiert werden. Bitte manuell ausfüllen.*'
        : '*Answer could not be generated. Please fill in manually.*',
      mode: 'ai',
      lastEditedAt: new Date().toISOString()
    };
  }
}


// ============================================================================
// STEP GENERATORS
// ============================================================================

// STEP 1: CONTEXT (uses sequential generation to prevent timeout)
async function generateStep1(state: PipelineState, language: string): Promise<Partial<PipelineState>> {
  console.log('[generateStep1] Using SEQUENTIAL generation for context_general...');

  // Use sequential generation - one question at a time
  const answers = await generateSectionAnswersSequentially(
    state,
    'context_general',
    1,
    language,
    '',
    (qId, current, total) => {
      console.log(`[generateStep1] Progress: ${current}/${total} - ${qId}`);
    }
  );

  // Map to legacy fields
  return {
    projectTitle: answers['projectTitle'] || state.idea.shortDescription.substring(0, 50),
    acronym: answers['acronym'] || 'NEW-PROJECT',
    answers: { ...state.answers, ...answers }
  };
}

// STEP 2: PARTICIPATING ORGANISATIONS (Chapter 2)
// Now split into sub-steps: 2.1, 2.2, 2.3, 2.4 (one per partner)
// This prevents timeout issues with large consortiums

/**
 * Generate Step 2 for a SINGLE partner (sub-step)
 * Called as Step 2.1, 2.2, 2.3, etc.
 */
export async function generateStep2ForPartner(
  state: PipelineState,
  partnerIndex: number,
  language: string
): Promise<Partial<PipelineState>> {
  const partner = state.consortium[partnerIndex];
  if (!partner) {
    console.error(`[generateStep2ForPartner] Partner at index ${partnerIndex} not found`);
    return { answers: state.answers };
  }

  console.log(`[generateStep2ForPartner] Generating for Partner ${partnerIndex + 1}: ${partner.name}`);

  const newAnswers: Record<string, AnswerData> = {};
  const qIds = ['org_presentation', 'org_experience', 'org_past_participation'];

  for (const qId of qIds) {
    console.log(`[generateStep2ForPartner] Generating ${qId} for ${partner.name}...`);
    const answer = await generateSinglePartnerAnswer(state, partner, qId, 2, language);
    newAnswers[`${qId}_${partner.id}`] = answer;
  }

  return {
    answers: { ...state.answers, ...newAnswers }
  };
}

/**
 * Legacy generateStep2 - generates ALL partners at once
 * WARNING: May timeout with 4+ partners!
 * Prefer using generateStep2ForPartner for each partner individually
 */
async function generateStep2(state: PipelineState, language: string): Promise<Partial<PipelineState>> {
  console.log('[generateStep2] Generating Organisations content for all partners...');
  console.warn('[generateStep2] WARNING: This may timeout with many partners. Consider using sub-steps.');

  const allAnswers: Record<string, AnswerData> = {};

  for (let i = 0; i < state.consortium.length; i++) {
    const partner = state.consortium[i];
    console.log(`[generateStep2] Partner ${i + 1}/${state.consortium.length}: ${partner.name}`);

    const qIds = ['org_presentation', 'org_experience', 'org_past_participation'];

    for (const qId of qIds) {
      const answer = await generateSinglePartnerAnswer(state, partner, qId, 2, language);
      allAnswers[`${qId}_${partner.id}`] = answer;
    }
  }

  return {
    answers: { ...state.answers, ...allAnswers }
  };
}

// STEP 3: RELEVANCE (Chapter 3 - priorities, description, needs_analysis)
// Uses SEQUENTIAL generation to prevent timeouts
async function generateStep3(state: PipelineState, language: string): Promise<Partial<PipelineState>> {
  console.log('[generateStep3] Using BUNDLED generation for Relevance (3 calls instead of ~10)...');
  const stepContext = buildStepContext(state, 3);

  // Section 1: priorities — bundled into 1 call
  const a1 = await generateSectionAnswers(state, 'priorities', 3, language, stepContext);
  console.log(`[generateStep3] Section 1/3 (priorities): ${Object.keys(a1).length} answers`);

  // Rate-Limit-Pause between sections
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Section 2: description — bundled into 1 call
  const a2 = await generateSectionAnswers(state, 'description', 3, language, stepContext);
  console.log(`[generateStep3] Section 2/3 (description): ${Object.keys(a2).length} answers`);

  // Rate-Limit-Pause between sections
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Section 3: needs_analysis — bundled into 1 call
  const a3 = await generateSectionAnswers(state, 'needs_analysis', 3, language, stepContext);
  console.log(`[generateStep3] Section 3/3 (needs_analysis): ${Object.keys(a3).length} answers`);

  const combined = { ...a1, ...a2, ...a3 };
  console.log('[generateStep3] Generated answers:', Object.keys(combined));

  // Map to legacy structured objects for compatibility
  const needsAnalysis: NeedsAnalysisSection = {
    problemStatement: combined['needs_address'] || '',
    targetGroupNeeds: [{ group: 'General', needs: [combined['target_groups'] || ''] }],
    europeanDimension: combined['eu_added_value'] || '',
    statistics: [],
    gaps: []
  };

  const objectives: ObjectivesSection = {
    generalObjective: combined['objectives_results'] || '',
    specificObjectives: (state.originalConcept?.objectives || []).map((o, i) => ({
      id: `so_${i}`,
      description: o.text,
      indicators: o.indicators || [],
    })),
    alignmentWithPriorities: combined['address_priorities'] || ''
  };

  return {
    needsAnalysis,
    objectives,
    answers: { ...state.answers, ...combined }
  };
}

// STEP 4: PARTNERSHIP (Chapter 4 - cooperation)
// Uses SEQUENTIAL generation to prevent timeouts
async function generateStep4(state: PipelineState, language: string): Promise<Partial<PipelineState>> {
  console.log('[generateStep4] Using BUNDLED generation for Partnership (1 call instead of 3)...');
  const stepContext = buildStepContext(state, 4);

  const answers = await generateSectionAnswers(state, 'cooperation', 4, language, stepContext);
  console.log('[generateStep4] Generated answers:', Object.keys(answers));
  return {
    answers: { ...state.answers, ...answers }
  };
}

// STEP 5: IMPACT (Chapter 5 - impact_general)
// Uses SEQUENTIAL generation to prevent timeouts
async function generateStep5(state: PipelineState, language: string): Promise<Partial<PipelineState>> {
  console.log('[generateStep5] Using BUNDLED generation for Impact (1 call instead of 4)...');
  const stepContext = buildStepContext(state, 5);

  const answers = await generateSectionAnswers(state, 'impact_general', 5, language, stepContext);
  console.log('[generateStep5] Generated answers:', Object.keys(answers));

  const impact: ImpactSection = {
    expectedImpact: answers['impact_description'] || '',
    targetGroupsImpact: [],
    stakeholderImpact: []
  };

  const dissemination: DisseminationSection = {
    strategy: answers['dissemination'] || '',
    channels: [],
    materials: [],
    events: []
  };

  const sustainability: SustainabilitySection = {
    strategy: answers['sustainability'] || '',
    resourcesInfo: '',
    longTermImpact: ''
  };

  return {
    impact,
    dissemination,
    sustainability,
    answers: { ...state.answers, ...answers }
  };
}

// STEP 6: IMPLEMENTATION/WORK PACKAGES (Chapter 6)

// Bundled activity field generation: generates one field (e.g. "content") for all 3 activities in a single API call
async function generateActivitiesFieldBundled(
  state: PipelineState,
  wpIndex: number,
  wpTitle: string,
  fieldType: 'content' | 'objectives' | 'results' | 'participants',
  language: string
): Promise<Record<string, string>> {
  const langName = language === 'de' ? 'Deutsch' : 'English';
  const partnerList = state.consortium.map(p =>
    `- ${p.name} (${p.country}, ${p.type}): ${p.expertise?.join(', ') || 'N/A'}`
  ).join('\n');

  const fieldDescriptions: Record<string, { label: string; question: string }> = {
    content: {
      label: 'Content',
      question: 'Describe the content of the proposed activities.'
    },
    objectives: {
      label: 'Objectives',
      question: 'Explain how these activities are going to help reach the WP objectives.'
    },
    results: {
      label: 'Expected Results',
      question: 'Describe the expected results of the activities.'
    },
    participants: {
      label: 'Participants',
      question: 'Expected number and profile of participants.'
    }
  };

  const fd = fieldDescriptions[fieldType];
  const isGerman = language === 'de';
  const charLimit = 3000;

  // Buffer for German text so English translation doesn't exceed EU limits
  const targetChars = isGerman ? Math.round(charLimit * 0.80) : Math.round(charLimit * 0.90);
  const minChars = isGerman ? Math.round(charLimit * 0.70) : Math.round(charLimit * 0.80);
  const targetWords = Math.round(targetChars / 7);
  const minWords = Math.round(minChars / 7);

  // Include cross-step context for coherent activities
  const stepContext = buildStepContext(state, 6);

  // Get the WP configuration to know which activities are planned
  const wpConfig = state.wpConfigurations?.find(w => w.wpNumber === wpIndex);
  const activitiesInfo = wpConfig?.selectedActivities?.length
    ? `Geplante Aktivitäten in diesem WP: ${wpConfig.selectedActivities.join(', ')}`
    : '';

  const prompt = `Du bist ein erfahrener Erasmus+ Antragsberater.

AUFGABE: Beantworte die folgende Frage für Work Package ${wpIndex}: "${wpTitle}".
Die Antwort soll ALLE Aktivitäten dieses Work Packages abdecken.

PROJEKT-KONTEXT:
Projektidee: ${state.idea.shortDescription || 'Bildungsprojekt'}
Projekttitel: ${state.projectTitle || 'Wird noch generiert'}
Akronym: ${state.acronym || 'Wird noch generiert'}
Sektor: ${state.idea.sector === 'ADU' ? 'Erwachsenenbildung' : state.idea.sector === 'VET' ? 'Berufsbildung' : state.idea.sector === 'SCH' ? 'Schulbildung' : 'Jugend'}
Aktionstyp: ${state.configuration?.actionType || 'KA220'}
Zielgruppen: ${state.idea.targetGroups?.join(', ') || 'Jugendliche, Erwachsene'}
Partner:
${partnerList}
${stepContext}
${activitiesInfo}

FRAGE (OFFIZIELLE EU-FRAGE):
${fd.question}

REGELN:
- Der Text MUSS ca. ${targetWords} Wörter umfassen (+/- 10-15%).
- Absolutes MINIMUM: ${minWords} Wörter (${minChars} Zeichen)!
- Beschreibe ALLE Aktivitäten des WP in einem zusammenhängenden Text.
- Strukturiere den Text mit **fetten Überschriften** pro Aktivität.
- Nutze - für Aufzählungen.
- Schreibe auf ${langName}.
- Nenne konkrete Zahlen, Tools, Methoden und Zielgruppen.
- Beziehe dich explizit auf die Partner und deren Rollen.

Antworte NUR mit dem Text (KEINE JSON-Formatierung, KEINE Einleitung wie "Hier ist...").`;

  const systemContext = `Du bist EU-Projektexperte für Erasmus+ Anträge. Generiere einen umfassenden, zusammenhängenden Text der alle Aktivitäten des Work Packages abdeckt. NIEMALS unter ${minWords} Wörtern.`;

  const response = await callGeminiForPipeline(prompt, systemContext, 0.7);

  // Clean up the response - remove markdown code fences if present
  let cleanResponse = response.replace(/```\w*/g, '').replace(/```/g, '').trim();

  // Map to the single consolidated answer key
  const results: Record<string, string> = {};
  results[`wp_act_${fieldType}_wp${wpIndex}`] = cleanResponse;

  console.log(`[generateActivitiesFieldBundled] WP${wpIndex} ${fieldType}: ${cleanResponse.length}c (consolidated)`);

  return results;
}

// Generate a single Activity (all 4 fields) for a specific WP
export async function generateSingleActivity(
  state: PipelineState,
  wpIndex: number,
  actNum: number,
  language: string,
  instruction?: string
): Promise<{ wp: WorkPackage; newAnswers: Record<string, string> }> {
  console.log(`[generateSingleActivity] Regenerating activities for WP${wpIndex}...`);

  const langName = language === 'de' ? 'Deutsch' : 'English';
  const wpTitle = state.workPackages?.find(w => w.number === wpIndex)?.title || `Work Package ${wpIndex}`;
  const stepContext = buildStepContext(state, 6);

  const partnerList = state.consortium.map(p =>
    `- ${p.name} (${p.country}, ${p.type}): ${p.expertise?.join(', ') || 'N/A'}`
  ).join('\n');

  // Get previous content for context if this is a regeneration
  const prevContent = state.answers?.[`wp_act_content_wp${wpIndex}`] || '';
  const prevContextText = prevContent ? `\n\nBISHERIGER INHALT:\n${prevContent}\nBAUE DARAUF AUF ODER VERBESSERE IHN.` : '';

  // Regenerate all 4 activity fields for this WP using the bundled generator
  const fields = ['content', 'objectives', 'results', 'participants'] as const;
  const newAnswers: Record<string, string> = {};

  for (const field of fields) {
    const fieldAnswers = await generateActivitiesFieldBundled(state, wpIndex, wpTitle, field, language);
    Object.assign(newAnswers, fieldAnswers);
    if (field !== 'participants') {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // Rebuild the WP object with these new answers
  const allAnswers = { ...state.answers, ...newAnswers };

  const existingWp = state.workPackages?.find(w => w.number === wpIndex);
  if (!existingWp) {
    throw new Error(`Work Package ${wpIndex} not found in state.`);
  }

  const wpConfig = state.wpConfigurations?.find(w => w.wpNumber === wpIndex);
  const actContent = allAnswers[`wp_act_content_wp${wpIndex}`];

  const updatedWp: WorkPackage = {
    ...existingWp,
    activities: actContent ? [{
      id: `wp${wpIndex}-activities`,
      title: `Activities WP${wpIndex}`,
      content: actContent,
      objectivesAlignment: allAnswers[`wp_act_objectives_wp${wpIndex}`] || '',
      expectedResults: allAnswers[`wp_act_results_wp${wpIndex}`] || '',
      participants: allAnswers[`wp_act_participants_wp${wpIndex}`] || '',
      description: actContent,
      month: wpConfig?.duration || { start: 1, end: 24 },
      type: 'Event',
      leader: state.consortium[0]?.id || ''
    } as Activity] : []
  };

  return { wp: updatedWp, newAnswers };
}

// Generate a single Work Package completely (all activities via field-bundled calls)
async function generateSingleWP(state: PipelineState, wpIndex: number, language: string): Promise<{ wp: WorkPackage, answers: Record<string, string> }> {
  const wpCount = state.configuration?.wpCount || 5;
  const isManagement = wpIndex === 1;
  const wpConfig = state.wpConfigurations?.find(w => w.wpNumber === wpIndex);

  let title = wpConfig?.title || 'Project Management';
  if (!wpConfig) {
    if (wpIndex > 1 && wpIndex < wpCount) {
      title = `Implementation Phase ${wpIndex - 1}`;
    } else if (wpIndex === wpCount) {
      title = 'Dissemination & Exploitation';
    }
  }

  console.log(`[generateSingleWP] Generating WP${wpIndex}: ${title}`);

  // STEP 1: Generate main WP content (objectives, description, etc.) — BUNDLED into 1 call
  const sectionId = isManagement ? 'wp_management' : `wp_implementation_wp${wpIndex}`;
  const stepContext = buildStepContext(state, 6);
  const wpContext = `Generiere Work Package ${wpIndex}: ${title}.\n${stepContext}`;

  console.log(`[generateSingleWP] WP${wpIndex} main content: BUNDLED (1 call instead of 5-7)...`);
  let wpAnswers = await generateSectionAnswers(state, sectionId, 6, language, wpContext);
  console.log(`[generateSingleWP] WP${wpIndex} main answers:`, Object.keys(wpAnswers));

  // STEP 2: Generate Activities section (4 consolidated fields)
  // WP1 (Management) has no activities — skip for WP1
  // 4 API calls: 1 per field (content, objectives, results, participants)
  let activitiesAnswers: Record<string, string> = {};
  if (!isManagement) {
    console.log(`[generateSingleWP] Generating activities for WP${wpIndex} (4 consolidated fields)...`);

    const fields = ['content', 'objectives', 'results', 'participants'] as const;
    for (const field of fields) {
      try {
        console.log(`[generateSingleWP] WP${wpIndex} activities field: ${field}...`);
        const fieldAnswers = await generateActivitiesFieldBundled(state, wpIndex, title, field, language);
        activitiesAnswers = { ...activitiesAnswers, ...fieldAnswers };
        // Delay between fields to avoid 429 rate limiting
        if (field !== 'participants') {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (e: any) {
        console.error(`[generateSingleWP] Activities ${field} failed:`, e.message);
        activitiesAnswers[`wp_act_${field}_wp${wpIndex}`] = '';
      }
    }
    console.log(`[generateSingleWP] WP${wpIndex} activities complete:`, Object.keys(activitiesAnswers).length, 'fields');
  } else {
    console.log(`[generateSingleWP] WP1 is Management — skipping activities generation`);
  }

  // Merge answers
  const allAnswers = { ...wpAnswers, ...activitiesAnswers };

  // Create WorkPackage object
  const wp: WorkPackage = {
    id: `wp${wpIndex}`,
    number: wpIndex,
    title: title,
    duration: wpConfig?.duration ? `M${wpConfig.duration.start}-M${wpConfig.duration.end}` : 'M1-M24',
    objectives: [isManagement ? allAnswers[`monitoring_wp${wpIndex}`] : allAnswers[`wp_objectives_wp${wpIndex}`]],
    description: isManagement ? allAnswers[`risk_management_wp${wpIndex}`] : allAnswers[`wp_partners_wp${wpIndex}`],
    activities: [],
    deliverables: [],
    budget: 0
  };

  // Build activities from consolidated answers (4 fields covering all activities)
  if (!isManagement) {
    const actContent = allAnswers[`wp_act_content_wp${wpIndex}`];
    if (actContent) {
      wp.activities = [{
        id: `wp${wpIndex}-activities`,
        title: `Activities WP${wpIndex}`,
        content: actContent,
        objectivesAlignment: allAnswers[`wp_act_objectives_wp${wpIndex}`] || '',
        expectedResults: allAnswers[`wp_act_results_wp${wpIndex}`] || '',
        participants: allAnswers[`wp_act_participants_wp${wpIndex}`] || '',
        description: actContent,
        month: wpConfig?.duration || { start: 1, end: 24 },
        type: 'Event',
        leader: wpConfig?.leadPartnerId || state.consortium[0]?.id || ''
      } as Activity];
    }
  }

  console.log(`[generateSingleWP] WP${wpIndex} complete`);

  return { wp, answers: allAnswers };
}

// Generate a single WP by index (for individual WP generation)
async function generateStep6ForWP(state: PipelineState, wpIndex: number, language: string): Promise<Partial<PipelineState>> {
  console.log(`[generateStep6ForWP] Generating single WP${wpIndex}...`);

  const { wp, answers } = await generateSingleWP(state, wpIndex, language);

  // Merge with existing workPackages (replace if exists, add if new)
  const existingWPs = state.workPackages || [];
  const existingIndex = existingWPs.findIndex(w => w.number === wpIndex);

  let newWorkPackages: WorkPackage[];
  if (existingIndex >= 0) {
    // Replace existing WP
    newWorkPackages = [...existingWPs];
    newWorkPackages[existingIndex] = wp;
  } else {
    // Add new WP and sort by number
    newWorkPackages = [...existingWPs, wp].sort((a, b) => a.number - b.number);
  }

  return {
    workPackages: newWorkPackages,
    answers: { ...state.answers, ...answers }
  };
}

// Legacy: Generate ALL WPs at once (may timeout - prefer generateStep6ForWP)
async function generateStep6(state: PipelineState, language: string): Promise<Partial<PipelineState>> {
  console.log('[generateStep6] Generating ALL Work Packages (legacy mode)...');
  const wpCount = state.configuration?.wpCount || 5;
  const newWorkPackages: WorkPackage[] = [];
  const allAnswers: Record<string, string> = {};

  // Generate each WP
  for (let i = 1; i <= wpCount; i++) {
    const { wp, answers } = await generateSingleWP(state, i, language);
    newWorkPackages.push(wp);
    Object.assign(allAnswers, answers);
  }

  return {
    workPackages: newWorkPackages,
    answers: { ...state.answers, ...allAnswers }
  };
}

// STEP 7: PROJECT SUMMARY (Chapter 7 - NOW AT END!)
// This generates the summary AFTER all other content is complete
async function generateStep7(state: PipelineState, language: string): Promise<Partial<PipelineState>> {
  console.log('[generateStep7] Generating Summary (final step)...');

  // Build comprehensive context from ALL previous steps
  const existingContent = buildStepContext(state, 7);

  const answers = await generateSectionAnswers(state, 'summary_content', 7, language, existingContent);
  console.log('[generateStep7] Summary generated:', Object.keys(answers));

  const summaryText = [
    answers['objectives'] || '',
    answers['implementation'] || '',
    answers['results'] || ''
  ].filter(Boolean).join('\n\n');

  return {
    executiveSummary: summaryText,
    answers: { ...state.answers, ...answers }
  };
}

// STEP 8: FINAL EVALUATION (Quality & Consistency Check)
// This is the last step - performs comprehensive review of the entire application
export async function generateStep8(state: PipelineState, language: string): Promise<{ evaluation: FinalEvaluationResult }> {
  console.log('[generateStep8] Running Final Evaluation...');

  const actionType = state.configuration?.actionType || 'KA220';
  const wpCount = state.configuration?.wpCount || 5;
  const structure = getOfficialPipelineStructure(actionType, wpCount);

  // Initialize result
  const result: FinalEvaluationResult = {
    overallScore: 0,
    timestamp: new Date().toISOString(),
    checklist: [],
    consistencyIssues: [],
    partnerWPAlignment: [],
    characterLimitCompliance: [],
    summary: '',
    recommendations: []
  };

  // 1. CHARACTER LIMIT COMPLIANCE CHECK
  console.log('[generateStep8] Checking character limits...');
  let charLimitIssues = 0;
  for (const chapter of structure) {
    for (const section of chapter.sections) {
      for (const question of section.questions) {
        if (question.charLimit && question.type === 'textarea') {
          const answer = state.answers[question.id];
          const answerValue = typeof answer === 'object' && 'value' in answer
            ? (answer as AnswerData).value
            : typeof answer === 'string' ? answer : '';

          const currentLength = answerValue?.length || 0;
          const isCompliant = currentLength <= question.charLimit;

          if (!isCompliant) charLimitIssues++;

          result.characterLimitCompliance.push({
            questionId: question.id,
            questionText: question.text,
            currentLength,
            maxLength: question.charLimit,
            isCompliant
          });
        }
      }
    }
  }

  result.checklist.push({
    id: 'char_limits',
    category: 'completeness',
    item: language === 'de' ? 'Zeichenlimits eingehalten' : 'Character limits respected',
    passed: charLimitIssues === 0,
    explanation: charLimitIssues > 0
      ? (language === 'de' ? `${charLimitIssues} Felder überschreiten das Zeichenlimit. Kürze diese Texte!` : `${charLimitIssues} fields exceed character limit. Shorten these texts!`)
      : (language === 'de' ? 'Alle Texte sind innerhalb der Limits.' : 'All texts are within limits.'),
    severity: charLimitIssues > 0 ? 'critical' : 'info'
  });

  // 2. PARTNER-WP ALIGNMENT CHECK
  console.log('[generateStep8] Checking partner-WP alignment...');
  for (const partner of state.consortium) {
    const assignedWPs: number[] = [];
    const responsibilities: string[] = [];
    const issues: string[] = [];

    // Check WP configurations for this partner
    if (state.wpConfigurations) {
      for (const wpConfig of state.wpConfigurations) {
        if (wpConfig.leadPartnerId === partner.id) {
          assignedWPs.push(wpConfig.wpNumber);
          responsibilities.push(`WP${wpConfig.wpNumber} Lead: ${wpConfig.title}`);
        }
      }
    }

    // Check if coordinator has WP1 lead
    if (partner.isLead && !assignedWPs.includes(1)) {
      issues.push(language === 'de'
        ? 'Koordinator sollte WP1 (Management) leiten'
        : 'Coordinator should lead WP1 (Management)');
    }

    // Check if partner has any WP lead
    if (assignedWPs.length === 0 && !partner.isLead) {
      issues.push(language === 'de'
        ? 'Partner hat keine WP-Leitung - Engagement unklar'
        : 'Partner has no WP lead - engagement unclear');
    }

    result.partnerWPAlignment.push({
      partnerId: partner.id,
      partnerName: partner.name,
      assignedWPs,
      responsibilities,
      isConsistent: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined
    });
  }

  const partnerAlignmentIssues = result.partnerWPAlignment.filter(p => !p.isConsistent).length;
  result.checklist.push({
    id: 'partner_wp_alignment',
    category: 'consistency',
    item: language === 'de' ? 'Partner-WP Zuordnung konsistent' : 'Partner-WP assignment consistent',
    passed: partnerAlignmentIssues === 0,
    explanation: partnerAlignmentIssues > 0
      ? (language === 'de' ? `${partnerAlignmentIssues} Partner haben Zuordnungsprobleme. Überprüfe die WP-Leads!` : `${partnerAlignmentIssues} partners have assignment issues. Check WP leads!`)
      : (language === 'de' ? 'Alle Partner sind klar zugeordnet.' : 'All partners are clearly assigned.'),
    severity: partnerAlignmentIssues > 0 ? 'warning' : 'info'
  });

  // 3. COMPLETENESS CHECK - Required fields filled
  console.log('[generateStep8] Checking completeness...');
  let missingFields = 0;
  const requiredQuestions: string[] = [];

  for (const chapter of structure) {
    for (const section of chapter.sections) {
      for (const question of section.questions) {
        if (question.required && question.type !== 'info') {
          const answer = state.answers[question.id];
          const hasAnswer = answer && (
            typeof answer === 'string' ? answer.length > 0 :
              typeof answer === 'object' && 'value' in answer ? (answer as AnswerData).value?.length > 0 :
                Array.isArray(answer) ? answer.length > 0 : false
          );
          if (!hasAnswer) {
            missingFields++;
            requiredQuestions.push(question.text);
          }
        }
      }
    }
  }

  result.checklist.push({
    id: 'completeness',
    category: 'completeness',
    item: language === 'de' ? 'Alle Pflichtfelder ausgefüllt' : 'All required fields filled',
    passed: missingFields === 0,
    explanation: missingFields > 0
      ? (language === 'de' ? `${missingFields} Pflichtfelder fehlen: ${requiredQuestions.slice(0, 3).join(', ')}${requiredQuestions.length > 3 ? '...' : ''}` : `${missingFields} required fields missing: ${requiredQuestions.slice(0, 3).join(', ')}${requiredQuestions.length > 3 ? '...' : ''}`)
      : (language === 'de' ? 'Alle Pflichtfelder sind ausgefüllt.' : 'All required fields are filled.'),
    severity: missingFields > 0 ? 'critical' : 'info'
  });

  // 4. CONSISTENCY CHECKS via AI
  console.log('[generateStep8] Running AI consistency analysis...');
  const consistencyPrompt = `Du bist ein erfahrener Erasmus+ Evaluator. Prüfe den folgenden Projektantrag auf KONSISTENZ.

PROJEKT-ÜBERSICHT:
- Titel: ${state.projectTitle || 'N/A'}
- Akronym: ${state.acronym || 'N/A'}
- Partner: ${state.consortium.map(p => `${p.name} (${p.country})`).join(', ')}
- Work Packages: ${state.workPackages?.map(wp => `WP${wp.number}: ${wp.title}`).join(', ') || 'N/A'}

KONSORTIUM-DETAILS:
${state.consortium.map(p => `
${p.name} (${p.isLead ? 'Koordinator' : 'Partner'}):
- Land: ${p.country}
- Typ: ${p.type}
- Expertise: ${p.expertise?.join(', ') || 'N/A'}
`).join('')}

WP-DETAILS:
${state.workPackages?.map(wp => `
WP${wp.number} - ${wp.title}:
- Lead: ${wp.lead || 'N/A'}
- Ziele: ${wp.objectives?.slice(0, 2).join('; ') || 'N/A'}
`).join('') || 'Keine WPs generiert'}

PRÜFE FOLGENDE PUNKTE:
1. Sind alle Partner sinnvoll in den WPs eingebunden?
2. Sind die WP-Leads logisch verteilt (Expertise passt zur WP-Aufgabe)?
3. Gibt es widersprüchliche Aussagen zwischen verschiedenen Abschnitten?
4. Sind KPIs messbar und realistisch?
5. Ist die Projektlogik schlüssig (Bedarfsanalyse → Ziele → Aktivitäten → Impact)?

Antworte NUR als JSON-Objekt mit dieser Struktur:
{
  "issues": [
    {"issue": "Beschreibung des Problems", "locations": ["WP2", "Partnerschaft"], "suggestion": "Verbesserungsvorschlag"}
  ],
  "positives": ["Positiver Aspekt 1", "Positiver Aspekt 2"],
  "overallConsistency": "gut" | "mittel" | "schlecht"
}`;

  try {
    const aiResponse = await callGeminiForPipeline(consistencyPrompt, 'Du bist ein kritischer Erasmus+ Evaluator.', 0.3);

    // Parse AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.issues && Array.isArray(parsed.issues)) {
        result.consistencyIssues = parsed.issues.map((i: any) => ({
          issue: i.issue || '',
          locations: i.locations || [],
          suggestion: i.suggestion || ''
        }));
      }

      // Add AI findings to checklist
      const consistencyLevel = parsed.overallConsistency || 'mittel';
      result.checklist.push({
        id: 'ai_consistency',
        category: 'consistency',
        item: language === 'de' ? 'KI-Konsistenzprüfung' : 'AI Consistency Check',
        passed: consistencyLevel === 'gut',
        explanation: parsed.positives?.slice(0, 2).join('. ') || (language === 'de' ? 'Keine spezifischen Stärken identifiziert' : 'No specific strengths identified'),
        severity: consistencyLevel === 'schlecht' ? 'critical' : consistencyLevel === 'mittel' ? 'warning' : 'info'
      });
    }
  } catch (e) {
    console.warn('[generateStep8] AI consistency check failed:', e);
    result.checklist.push({
      id: 'ai_consistency',
      category: 'consistency',
      item: language === 'de' ? 'KI-Konsistenzprüfung' : 'AI Consistency Check',
      passed: false,
      explanation: language === 'de' ? 'KI-Analyse konnte nicht durchgeführt werden.' : 'AI analysis could not be performed.',
      severity: 'warning'
    });
  }

  // 5. CALCULATE OVERALL SCORE
  const totalChecks = result.checklist.length;
  const passedChecks = result.checklist.filter(c => c.passed).length;
  const criticalFails = result.checklist.filter(c => !c.passed && c.severity === 'critical').length;

  result.overallScore = Math.max(0, Math.round((passedChecks / totalChecks) * 100) - (criticalFails * 10));

  // 6. GENERATE SUMMARY & RECOMMENDATIONS
  result.summary = language === 'de'
    ? `Gesamtbewertung: ${result.overallScore}% (${passedChecks}/${totalChecks} Prüfungen bestanden). ${criticalFails > 0 ? `⚠️ ${criticalFails} kritische Probleme gefunden!` : '✅ Keine kritischen Probleme.'}`
    : `Overall score: ${result.overallScore}% (${passedChecks}/${totalChecks} checks passed). ${criticalFails > 0 ? `⚠️ ${criticalFails} critical issues found!` : '✅ No critical issues.'}`;

  // Generate recommendations based on findings
  if (charLimitIssues > 0) {
    result.recommendations.push(language === 'de'
      ? 'Kürze die Texte, die das Zeichenlimit überschreiten.'
      : 'Shorten texts that exceed character limits.');
  }
  if (partnerAlignmentIssues > 0) {
    result.recommendations.push(language === 'de'
      ? 'Überprüfe die Partner-WP-Zuordnungen für klare Verantwortlichkeiten.'
      : 'Review partner-WP assignments for clear responsibilities.');
  }
  if (missingFields > 0) {
    result.recommendations.push(language === 'de'
      ? 'Fülle alle Pflichtfelder aus, bevor du einreichst.'
      : 'Fill all required fields before submitting.');
  }
  if (result.consistencyIssues.length > 0) {
    result.recommendations.push(language === 'de'
      ? `Behebe die ${result.consistencyIssues.length} identifizierten Konsistenzprobleme.`
      : `Address the ${result.consistencyIssues.length} identified consistency issues.`);
  }

  if (result.recommendations.length === 0) {
    result.recommendations.push(language === 'de'
      ? '✅ Der Antrag ist bereit zur Einreichung!'
      : '✅ The application is ready for submission!');
  }

  console.log('[generateStep8] Final Evaluation complete:', result.summary);

  return { evaluation: result };
}

// ============================================================================
// SINGLE WORK PACKAGE GENERATION
// ============================================================================

// Use centralized Erasmus+ knowledge for WP generation
const WP_GENERATION_CONTEXT = `
${WORK_PACKAGE_GUIDELINES}

${ELIGIBLE_ACTIVITIES}

## VERPFLICHTENDE SMART-INDIKATOREN:
- KEINE vagen Formulierungen wie "erhöhtes Bewusstsein"
- Konkrete Zahlen: "200 Teilnehmer", "5 Module", "1000 Downloads"
- Messbare Prozentsätze: "80% Zufriedenheit", "60% Wissensverbesserung"
- Zeitgebundene Ziele: "bis Monat 12", "innerhalb von 6 Monaten"
`;

export interface WPGenerationConfig {
  wpNumber: number;
  type: string;
  title: string;
  titleDE: string;
  leadPartnerId: string;
  selectedActivities: string[];
  selectedDeliverables: string[];
  budgetPercent: number;
  duration: { start: number; end: number };
  objectives: string[];
  budgetDetails?: {
    expertDays: number;
    expertDayCost: number;
    accommodationCost: number;
    accommodationNights: number;
    travelCost: number;
    participantCount: number;
    eventCost: number;
    materialsCost: number;
  };
}

/**
 * Generate a SINGLE Work Package with detailed content
 * Called when user clicks "Generate WP" button for a specific WP
 */
export async function generateSingleWorkPackage(
  state: PipelineState,
  wpConfig: WPGenerationConfig,
  language: string
): Promise<{ workPackage: WorkPackage; answers: Record<string, AnswerData> }> {
  const wpNumber = wpConfig.wpNumber;
  const isManagement = wpConfig.type === 'MANAGEMENT';

  console.log(`[generateSingleWorkPackage] Generating WP${wpNumber}: ${wpConfig.title}`);

  // Get lead partner info
  const leadPartner = state.consortium.find(p => p.id === wpConfig.leadPartnerId);
  const leadPartnerName = leadPartner?.name || 'Unknown Partner';
  const leadPartnerCountry = leadPartner?.country || 'DE';

  // Get knowledge pool context
  const knowledgePoolContext = getKnowledgePoolContext(state.knowledgePool);

  // Get concept context if available
  const conceptContext = state.originalConcept
    ? `
=== KONZEPT-KONTEXT (BINDEND — WP muss sich an das Konzept halten) ===
Projekt-Innovation: ${state.originalConcept.innovation || 'N/A'}
Problemstellung: ${state.originalConcept.problemStatement || 'N/A'}
Erwarteter Impact: ${state.originalConcept.expectedImpact || 'N/A'}
Projektdauer: ${state.configuration?.duration || 24} Monate
Gesamtbudget: ${state.configuration?.totalBudget || 250000} EUR
Partnerländer: ${[...new Set(state.consortium?.map(p => p.country) || [])].join(', ')}
${state.originalConcept.detailedConcept ? `\nDetailliertes Konzept (WICHTIGSTE QUELLE):\n${state.originalConcept.detailedConcept}\n` : ''}
${state.originalConcept.ltta ? `LTTA geplant: ${state.originalConcept.ltta.count} Events mit ${state.originalConcept.ltta.participants} Teilnehmern` : ''}
${state.originalConcept.multiplierEvents ? `Multiplier Events: ${state.originalConcept.multiplierEvents.count} Events` : ''}
${(state.originalConcept as any).starsData ? `
=== STARS EXPOSÉ — STRUKTURIERTE PROJEKT-DATEN ===
${(state.originalConcept as any).starsData.goals?.length > 0 ? `Projektziele:\n${(state.originalConcept as any).starsData.goals.map((g: any) => `G${g.number}: ${g.statement} (Messbar: ${g.measurableOutcome})`).join('\n')}\n` : ''}
${(state.originalConcept as any).starsData.starsTargetGroups?.length > 0 ? `Zielgruppen:\n${(state.originalConcept as any).starsData.starsTargetGroups.map((tg: any) => `${tg.level}: ${tg.name} — Reichweite: ${tg.estimatedReach}`).join('\n')}\n` : ''}
${(state.originalConcept as any).starsData.methodPrinciples?.length > 0 ? `Methodologische Prinzipien:\n${(state.originalConcept as any).starsData.methodPrinciples.map((mp: any) => `- ${mp.name}: ${mp.description}`).join('\n')}\n` : ''}
=== ENDE STARS DATEN ===` : ''}
WICHTIG: Aktivitäten und Deliverables dieses WP MÜSSEN mit dem Konzept konsistent sein. Keine neuen Zahlen erfinden!
`
    : '';

  // Build partner list with country for rate calculation context
  const partnerList = state.consortium.map(p =>
    `${p.name} (${p.country}, ${p.type})${p.id === wpConfig.leadPartnerId ? ' - WP Lead' : ''}`
  ).join(', ');

  // Get selected activities and deliverables as context
  const activitiesContext = wpConfig.selectedActivities.length > 0
    ? `Ausgewählte Aktivitäten: ${wpConfig.selectedActivities.join(', ')}`
    : '';
  const deliverablesContext = wpConfig.selectedDeliverables.length > 0
    ? `Ausgewählte Ergebnisse: ${wpConfig.selectedDeliverables.join(', ')}`
    : '';

  const prompt = `Du bist ein erfahrener Erasmus+ Antragsberater. Generiere detaillierten Inhalt für Work Package ${wpNumber}.

${WP_GENERATION_CONTEXT}
${conceptContext}

=== PROJEKT ===
Titel: ${state.projectTitle || state.idea.shortDescription}
Akronym: ${state.acronym || 'N/A'}
Aktionstyp: ${state.configuration?.actionType || 'KA220'}
Sektor: ${state.idea.sector}
Projektdauer: ${state.configuration?.duration || 24} Monate
Partner: ${partnerList}
Hauptziel: ${state.idea.mainObjective}
Gesamtbudget: ${state.configuration?.totalBudget || 250000}€

=== WORK PACKAGE KONFIGURATION ===
WP Nummer: ${wpNumber}
WP Typ: ${wpConfig.type}
Titel: ${language === 'de' ? wpConfig.titleDE : wpConfig.title}
Lead Partner: ${leadPartnerName}
Budget: ${wpConfig.budgetPercent}% (${Math.round((state.configuration?.totalBudget || 250000) * wpConfig.budgetPercent / 100)}€)
Dauer: M${wpConfig.duration.start} - M${wpConfig.duration.end}
${activitiesContext}
${deliverablesContext}
${wpConfig.budgetDetails ? `
=== BUDGET DETAILS FÜR DIESES WP ===
- Expertentage: ${wpConfig.budgetDetails.expertDays || 0} Tage à ${wpConfig.budgetDetails.expertDayCost || 400}€ = ${(wpConfig.budgetDetails.expertDays || 0) * (wpConfig.budgetDetails.expertDayCost || 400)}€
- Unterkunft: ${wpConfig.budgetDetails.accommodationNights || 0} Nächte à ${wpConfig.budgetDetails.accommodationCost || 120}€
- Reisekosten: ${wpConfig.budgetDetails.travelCost || 0}€
- Teilnehmer: ${wpConfig.budgetDetails.participantCount || 0} Personen
- Veranstaltungskosten: ${wpConfig.budgetDetails.eventCost || 0}€
- Materialkosten: ${wpConfig.budgetDetails.materialsCost || 0}€
WICHTIG: Referenziere diese Budgetposten in der Beschreibung und Budget-Begründung!
` : ''}

${knowledgePoolContext ? knowledgePoolContext : ''}

=== AUFGABE ===
Generiere vollständigen WP-Inhalt mit folgender Struktur:

## Ziele des Work Package
- 3-4 spezifische, messbare Ziele
- SMART-Kriterien anwenden

## Aktivitäten
- 3-5 konkrete Aktivitäten
- Für jede: Titel, Beschreibung, Zeitraum, verantwortlicher Partner

## Ergebnisse/Deliverables
- 2-4 konkrete Outputs
- Für jeden: Titel, Beschreibung, Typ, Fertigstellungsmonat

## Indikatoren
- 3-4 messbare SMART-Indikatoren
- Quantitative Ziele (Zahlen, Prozente)

## Rollen & Verantwortlichkeiten
- Wer macht was in diesem WP?
- Lead Partner Aufgaben
- Beteiligte Partner und deren Beiträge

${isManagement ? `
## Projektmanagement-Spezifisch
- Qualitätssicherung
- Risikomanagement
- Kommunikationsstruktur
- Monitoring & Evaluation
` : ''}

=== FORMAT ===
Antworte als JSON. ACHTUNG auf Mindestlängen!
  "objectives": ["Ziel 1 (1-2 Sätze)", "Ziel 2 (1-2 Sätze)", "Ziel 3 (1-2 Sätze)", "Ziel 4 (optional)"],
  "description": "MINDESTENS ca. ${language === 'de' ? '280-320' : '350-400'} Wörter (${language === 'de' ? '2000-2400' : '2500-3000'} Zeichen)! Ausführliche WP-Beschreibung mit: Kontext, Ansatz, Methodik, erwartete Ergebnisse, Zusammenhang mit Projektzielen. Als Fließtext mit Markdown-Formatierung.",
  "activities": [
    {
      "title": "Aktivität Titel",
      "description": "MINDESTENS ca. ${language === 'de' ? '90-110' : '120-150'} Wörter (${language === 'de' ? '600-800' : '800-1000'} Zeichen)! Beschreibe: Was wird gemacht? Wie wird es durchgeführt? Welche Methoden? Welche Ergebnisse werden erwartet?",
      "methodology": "Detaillierte Methodik (mind. 40 Wörter): Workshops, Peer-Learning, Online-Kollaboration, etc.",
      "targetGroups": "Spezifische Zielgruppen mit Zahlen (z.B. 20 Lehrende, 50 Studierende)",
      "monthStart": 1,
      "monthEnd": 6,
      "leadPartner": "${leadPartnerName}",
      "type": "Meeting/Training/Development/Research/Event"
    }
  ],
  "deliverables": [
    {
      "title": "Deliverable Titel",
      "description": "Mind. 40 Wörter: Was genau wird produziert? Format? Umfang? Zielgruppe?",
      "type": "Report/Toolkit/Training Material/Platform/Event",
      "completionMonth": 12
    }
  ],
  "indicators": [
    {
      "indicator": "SMART Indikator mit konkreter Zahl",
      "target": "Quantitativer Zielwert (z.B. 80%, 100 Teilnehmer)",
      "measurementMethod": "Konkrete Messmethode (Umfrage, Tracking, Dokumentation)"
    }
  ],
  "partnerRoles": {
    "${leadPartnerName}": "Lead Rolle mit konkreten Aufgaben (mind. 30 Wörter)",
    "Partner 2": "Spezifischer Beitrag mit Aufgaben..."
  },
  "budgetRationale": "MINDESTENS ca. ${language === 'de' ? '500-550' : '650-700'} Wörter (${language === 'de' ? '3500-4000' : '4500-5000'} Zeichen)! Erkläre SEHR AUSFÜHRLICH: Wie wird das Budget verwendet? Welche Kostenpositionen gibt es? Warum ist jede Kostenposition..."
}

=== FORMATIERUNG (WICHTIG!) ===
In der "description" nutze strenges Markdown:
- **### Überschriften** (H3) für Hauptabschnitte (NICHT ## H2 verwenden!)
- **#### Unterüberschriften** (H4) für Details
- **Fett** NUR für Schlüsselbegriffe (sparsam, nie ganze Sätze!)
- Bullet Points mit - für konkrete Schritte
- ERFINDE KEINE neuen Aktivitäten oder Outputs, die nicht im Konzept stehen!

Schreibe auf ${LANGUAGE_NAMES[language as Language] || language}.`;

  const systemContext = `Du bist ein hochpräziser Erasmus+ WP-Experte. Generiere detaillierte, professionelle Work Package Inhalte.
REGEL 1: Halte dich absolut strikt an das "URSPRÜNGLICHE KONZEPT". Keine neuen Deliverables, Partner oder Zeitpläne erfinden.
REGEL 2: Nutze sauberes Markdown (H3/H4, Bullet Points).

WICHTIGE LOGIK-REGELN FÜR WORK PACKAGES:
- VERMEIDE FLASCHENHÄLSE (Bottlenecks): Work Packages müssen parallel oder leicht überlappend stattfinden. Wenn WP2 auf der Analyse aus WP3 aufbaut, zeige klar auf, dass die Entwicklung schon parallel startet, z.B. auf Basis von Vorabergebnissen.
- TRAIN-THE-TRAINER ANSATZ: Wenn Pädagogen/Trainer in diesem WP ausgebildet werden (oder in einem vorherigen WP ausgebildet wurden), integriere Pilottests oder Implementierungsphasen, in denen diese ihr Wissen mit ihren eigenen Lernenden anwenden.
- KEINE BUZZWORDS: Nutze für technische Ergebnisse konkrete Beschreibungen (z.B. "Web-Applikation mit LLM-API-Anbindung" statt "AI-based companion"). Zeige die technische Machbarkeit.
- INKLUSIVES WORDING: Nutze "Europa" oder "europäisch" statt "EU", um Nicht-EU-Länder (wie Serbien) korrekt abzubilden.

⚠️⚠️⚠️ KRITISCH - TEXTLÄNGE (+/- 10-15% Toleranz) ⚠️⚠️⚠️
- "description" MUSS ca. ${language === 'de' ? '280-320' : '350-400'} Wörter haben (ausführlicher Fließtext!)
- "activities" Beschreibung MUSS ca. ${language === 'de' ? '90-110' : '120-150'} Wörter haben
- "budgetRationale" MUSS ca. ${language === 'de' ? '500-550' : '650-700'} Wörter haben! Das ist ein extrem langes Feld!
- KI-Modelle verschätzen sich bei Zeichen, halte dich streng an die WORT-Grenzen!
- ZU KURZE Texte werden als UNVOLLSTÄNDIG abgelehnt!
- Schreibe AUSFÜHRLICH mit konkreten Details, Methoden, Zeitrahmen

QUALITÄTS-ANFORDERUNGEN:
- Nutze konkrete Zahlen, Zeitrahmen und verantwortliche Partner
- Alle Indikatoren müssen SMART sein - keine vagen Formulierungen!
- Beschreibe WIE Aktivitäten durchgeführt werden, nicht nur WAS
- Referenziere Budget-Details wo vorhanden (Expertentage, Reisekosten etc.)`;

  try {
    const response = await callGeminiForPipeline(prompt, systemContext, 0.7);

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Keine gültige JSON-Antwort');
    }

    const wpData = JSON.parse(jsonMatch[0]);

    // Create WorkPackage object
    const workPackage: WorkPackage = {
      id: `wp${wpNumber} `,
      number: wpNumber,
      title: language === 'de' ? wpConfig.titleDE : wpConfig.title,
      duration: `M${wpConfig.duration.start} -M${wpConfig.duration.end} `,
      objectives: wpData.objectives || [],
      description: wpData.description || '',
      activities: (wpData.activities || []).map((act: any, i: number) => ({
        id: `wp${wpNumber} -act${i + 1} `,
        title: act.title,
        description: act.description,
        content: act.description, // For display compatibility
        month: {
          start: act.monthStart || wpConfig.duration.start,
          end: act.monthEnd || wpConfig.duration.end
        },
        type: act.type || 'Event',
        leader: wpConfig.leadPartnerId,
        responsible: leadPartnerName // For display compatibility
      })),
      deliverables: (wpData.deliverables || []).map((del: any, i: number) => ({
        id: `wp${wpNumber} -del${i + 1} `,
        title: del.title,
        description: del.description,
        type: del.type || 'Report',
        month: `M${del.completionMonth} `,
        dueMonth: del.completionMonth // For display compatibility
      })),
      budget: Math.round((state.configuration?.totalBudget || 250000) * wpConfig.budgetPercent / 100)
    };

    // Create answers for the official pipeline structure
    const answers: Record<string, AnswerData> = {
      [`wp_objectives_wp${wpNumber} `]: {
        value: wpData.objectives?.join('\n\n') || '',
        mode: 'ai',
        lastEditedAt: new Date().toISOString()
      },
      [`wp_description_wp${wpNumber} `]: {
        value: wpData.description || '',
        mode: 'ai',
        lastEditedAt: new Date().toISOString()
      },
      [`wp_activities_wp${wpNumber} `]: {
        value: wpData.activities?.map((a: any) => `** ${a.title}** (${a.type}, M${a.monthStart} -M${a.monthEnd}) \n${a.description} `).join('\n\n') || '',
        mode: 'ai',
        lastEditedAt: new Date().toISOString()
      },
      [`wp_deliverables_wp${wpNumber} `]: {
        value: wpData.deliverables?.map((d: any) => `** ${d.title}** (${d.type}, M${d.completionMonth}) \n${d.description} `).join('\n\n') || '',
        mode: 'ai',
        lastEditedAt: new Date().toISOString()
      },
      [`wp_indicators_wp${wpNumber} `]: {
        value: wpData.indicators?.map((ind: any) => `** ${ind.indicator}**\nZiel: ${ind.target} \nMessung: ${ind.measurementMethod} `).join('\n\n') || '',
        mode: 'ai',
        lastEditedAt: new Date().toISOString()
      },
      [`wp_partners_wp${wpNumber} `]: {
        value: Object.entries(wpData.partnerRoles || {}).map(([partner, role]) => `** ${partner}**: ${role} `).join('\n\n') || '',
        mode: 'ai',
        lastEditedAt: new Date().toISOString()
      },
      [`wp_budget_wp${wpNumber} `]: {
        value: wpData.budgetRationale || '',
        mode: 'ai',
        lastEditedAt: new Date().toISOString()
      }
    };

    // Add individual activity answers - NEW 4-question format per activity
    // Keys: wp_act{N}_content_wp{X}, wp_act{N}_objectives_wp{X}, wp_act{N}_results_wp{X}, wp_act{N}_participants_wp{X}
    const activities = wpData.activities || [];
    for (let actNum = 1; actNum <= 3; actNum++) {
      const activity = activities[actNum - 1];
      const contentKey = `wp_act${actNum}_content_wp${wpNumber} `;
      const objectivesKey = `wp_act${actNum}_objectives_wp${wpNumber} `;
      const resultsKey = `wp_act${actNum}_results_wp${wpNumber} `;
      const participantsKey = `wp_act${actNum}_participants_wp${wpNumber} `;

      if (activity) {
        // Content: Describe the content of the proposed activities
        answers[contentKey] = {
          value: activity.content || activity.description || `${activity.title}: ${activity.description || 'Activity description'} `,
          mode: 'ai',
          lastEditedAt: new Date().toISOString()
        };
        // Objectives: How activities help reach WP objectives
        answers[objectivesKey] = {
          value: activity.objectivesAlignment || `This activity directly contributes to the WP objectives by ${activity.description?.substring(0, 100) || 'implementing key project milestones'}.`,
          mode: 'ai',
          lastEditedAt: new Date().toISOString()
        };
        // Results: Expected results of the activities
        answers[resultsKey] = {
          value: activity.expectedResults || `Expected outcomes include concrete deliverables and measurable results that will advance the project goals.`,
          mode: 'ai',
          lastEditedAt: new Date().toISOString()
        };
        // Participants: Number and profile of participants
        answers[participantsKey] = {
          value: activity.participants || `Participants will include project partners, associated partners, and relevant stakeholders(estimated 15 - 30 participants per activity).`,
          mode: 'ai',
          lastEditedAt: new Date().toISOString()
        };
      } else {
        // Generate empty placeholders for missing activities
        answers[contentKey] = { value: '', mode: 'ai', lastEditedAt: new Date().toISOString() };
        answers[objectivesKey] = { value: '', mode: 'ai', lastEditedAt: new Date().toISOString() };
        answers[resultsKey] = { value: '', mode: 'ai', lastEditedAt: new Date().toISOString() };
        answers[participantsKey] = { value: '', mode: 'ai', lastEditedAt: new Date().toISOString() };
      }
    }

    console.log(`[generateSingleWorkPackage] WP${wpNumber} generated successfully with ${workPackage.activities.length} activities, ${workPackage.deliverables.length} deliverables`);

    return { workPackage, answers };

  } catch (error: any) {
    console.error(`[generateSingleWorkPackage] Error: `, error.message);

    // Return minimal WP on error
    return {
      workPackage: {
        id: `wp${wpNumber} `,
        number: wpNumber,
        title: language === 'de' ? wpConfig.titleDE : wpConfig.title,
        duration: `M${wpConfig.duration.start} -M${wpConfig.duration.end} `,
        objectives: [],
        description: '',
        activities: [],
        deliverables: [],
        budget: Math.round((state.configuration?.totalBudget || 250000) * wpConfig.budgetPercent / 100)
      },
      answers: {}
    };
  }
}

// ============================================================================
// CRITICAL EVALUATOR
// ============================================================================

export async function runCriticalEvaluator(
  state: PipelineState,
  stepNumber: number,
  generatedContent: unknown,
  language: string
): Promise<EvaluatorFeedback> {
  const steps = getPipelineSteps(state.configuration?.wpCount);
  const step = steps.find(s => s.id === stepNumber);

  if (!step) {
    // Fallback for evaluator if step not matches
    return { step: stepNumber, stepName: 'Unknown', score: 0, strengths: [], weaknesses: [], suggestions: [], criticalIssues: [] };
  }

  const ragContext = await getRAGContext(
    `Erasmus + Evaluierungskriterien ${step.name} Bewertung Qualität`
  );

  const prompt = `Du bist ein strenger, erfahrener Erasmus + Evaluator.Bewerte den folgenden Antragsteil kritisch.

    SCHRITT: ${step.name}
  
  GENERIERTER INHALT:
  ${JSON.stringify(generatedContent, null, 2)}

  PROJEKTKONTEXT:
  - Titel: ${state.projectTitle || 'Noch nicht definiert'}
  - Akronym: ${state.acronym || 'Noch nicht definiert'}
  
  ${ragContext}
  
  Bewerte nach Erasmus + Standards(Relevanz, Design, Team, Impact).
  Sei KRITISCH aber KONSTRUKTIV.
  
  Antwort als JSON:
  {
    "score": 7,
      "strengths": ["Stärke 1", "..."],
        "weaknesses": ["**Titel**: Erklärung"],
          "suggestions": ["Vorschlag 1"],
            "criticalIssues": []
  } `;

  const systemContext = `Du bist ein kritischer Erasmus + Evaluator.`;

  try {
    const response = await callGeminiForPipeline(prompt, systemContext, 0.4);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const evaluation = JSON.parse(jsonMatch[0]);
        return {
          step: stepNumber,
          stepName: step.name,
          score: evaluation.score,
          strengths: evaluation.strengths || [],
          weaknesses: evaluation.weaknesses || [],
          suggestions: evaluation.suggestions || [],
          criticalIssues: evaluation.criticalIssues || [],
        };
      }
    } catch (parseError) {
      console.warn(`[runCriticalEvaluator] JSON parse failed: `, parseError);
    }
  } catch (e: any) {
    // Graceful fallback: Evaluator failure should NOT crash the step
    console.warn(`[runCriticalEvaluator] Evaluation failed(likely rate limit): `, e.message);
    return {
      step: stepNumber,
      stepName: step.name,
      score: 0,
      strengths: [],
      weaknesses: ['Evaluierung konnte nicht durchgeführt werden (API-Limit). Versuchen Sie es später erneut.'],
      suggestions: [],
      criticalIssues: []
    };
  }

  return { step: stepNumber, stepName: step.name, score: 0, strengths: [], weaknesses: [], suggestions: [], criticalIssues: [] };
}


// ============================================================================
// MAIN PIPELINE EXECUTOR
// ============================================================================

/**
 * Execute a single step OR sub-step of the pipeline
 *
 * Step 2 supports sub-steps: 2.1, 2.2, 2.3, 2.4 (one per partner)
 * Use subStepIndex to generate for a specific partner only
 *
 * @param state - Current pipeline state
 * @param stepNumber - Main step number (1-7)
 * @param language - Language for generation
 * @param onProgress - Progress callback
 * @param subStepIndex - Optional: Partner index for Step 2 sub-steps (0-based)
 */
export async function executeStep(
  state: PipelineState,
  stepNumber: number,
  language: string = 'de',
  onProgress?: (status: string) => void,
  subStepIndex?: number
): Promise<{ newState: PipelineState; evaluation: EvaluatorFeedback }> {

  const actionType = state.configuration?.actionType || 'KA220';
  const wpCount = state.configuration?.wpCount || 5;
  const structure = getOfficialPipelineStructure(actionType, wpCount);
  const stepName = structure.find((c: any) => c.id === stepNumber)?.title || `Step ${stepNumber} `;

  // Handle sub-steps for Step 2 (Organisations) and Step 6 (Work Packages)
  if (stepNumber === 2 && subStepIndex !== undefined) {
    const partner = state.consortium[subStepIndex];
    if (partner) {
      onProgress?.(`Generiere Schritt 2.${subStepIndex + 1}: ${partner.name}...`);
    }
  } else if (stepNumber === 6 && subStepIndex !== undefined) {
    // WP generation with sub-step (wpIndex = subStepIndex + 1)
    const wpNumber = subStepIndex + 1;
    onProgress?.(`Generiere Work Package ${wpNumber}...`);
  } else {
    onProgress?.(`Generiere Schritt ${stepNumber}: ${stepName}...`);
  }

  let generatedContent: Partial<PipelineState> = {};

  try {
    switch (stepNumber) {
      case 1: generatedContent = await generateStep1(state, language); break;
      case 2:
        // Step 2 supports sub-steps for individual partners
        if (subStepIndex !== undefined) {
          generatedContent = await generateStep2ForPartner(state, subStepIndex, language);
        } else {
          // Legacy: Generate all partners at once (may timeout!)
          generatedContent = await generateStep2(state, language);
        }
        break;
      case 3: generatedContent = await generateStep3(state, language); break;
      case 4:
        if (actionType === 'KA210') {
          // KA210 Step 4 is Activities (WPs)
          generatedContent = await generateStep6(state, language);
        } else {
          generatedContent = await generateStep4(state, language);
        }
        break;
      case 5: generatedContent = await generateStep5(state, language); break;
      case 6:
        if (actionType === 'KA210') {
          // KA210 Step 6 is Summary
          generatedContent = await generateStep7(state, language);
        } else {
          // Step 6 supports sub-steps for individual WPs
          if (subStepIndex !== undefined) {
            // Generate single WP (wpIndex = subStepIndex + 1, since WPs are 1-indexed)
            const wpIndex = subStepIndex + 1;
            generatedContent = await generateStep6ForWP(state, wpIndex, language);
          } else {
            // Legacy: Generate all WPs at once (may timeout!)
            generatedContent = await generateStep6(state, language);
          }
        }
        break;
      case 7:
        if (actionType === 'KA220') {
          generatedContent = await generateStep7(state, language);
        } else {
          throw new Error(`Step 7 not valid for KA210`);
        }
        break;
      case 8:
        // Step 8: Final Evaluation - special handling
        // Returns evaluation result, not content
        const evalResult = await generateStep8(state, language);
        // Store evaluation result in state
        return {
          newState: {
            ...state,
            currentStep: 8,
            // Store final evaluation in evaluatorFeedback with special marker
            evaluatorFeedback: [
              ...state.evaluatorFeedback,
              {
                step: 8,
                stepName: language === 'de' ? 'Finale Evaluierung' : 'Final Evaluation',
                score: evalResult.evaluation.overallScore / 10, // Convert to 1-10 scale
                strengths: evalResult.evaluation.checklist.filter(c => c.passed).map(c => c.item),
                weaknesses: evalResult.evaluation.checklist.filter(c => !c.passed).map(c => c.explanation),
                suggestions: evalResult.evaluation.recommendations,
                criticalIssues: evalResult.evaluation.consistencyIssues.map(i => i.issue)
              }
            ]
          },
          evaluation: {
            step: 8,
            stepName: language === 'de' ? 'Finale Evaluierung' : 'Final Evaluation',
            score: evalResult.evaluation.overallScore / 10,
            strengths: evalResult.evaluation.checklist.filter(c => c.passed).map(c => c.item),
            weaknesses: evalResult.evaluation.checklist.filter(c => !c.passed).map(c => c.explanation),
            suggestions: evalResult.evaluation.recommendations,
            criticalIssues: evalResult.evaluation.consistencyIssues.map(i => i.issue)
          }
        };
      default: throw new Error(`Unknown step ${stepNumber} `);
    }
  } catch (e: any) {
    console.error(`Error generating step ${stepNumber}: `, e);
    throw e;
  }

  // State update
  const newState: PipelineState = {
    ...state,
    ...generatedContent,
    currentStep: stepNumber,
    answers: { ...state.answers, ...generatedContent.answers }
  };

  // Evaluation - with proper naming for sub-steps
  let evaluationStepName = stepName;
  if (stepNumber === 2 && subStepIndex !== undefined) {
    const partner = state.consortium[subStepIndex];
    evaluationStepName = partner ? `Organisations - ${partner.name} ` : `Partner ${subStepIndex + 1} `;
  } else if (stepNumber === 6 && subStepIndex !== undefined) {
    const wpNumber = subStepIndex + 1;
    evaluationStepName = `Work Package ${wpNumber} `;
  }

  onProgress?.('Kritische Bewertung läuft...');
  // Rate-Limit-Pause: Warte 5s nach Generierung bevor Evaluator startet
  await new Promise(resolve => setTimeout(resolve, 5000));
  const evaluation = await runCriticalEvaluator(newState, stepNumber, generatedContent, language);

  // Override step name for sub-steps
  if ((stepNumber === 2 || stepNumber === 6) && subStepIndex !== undefined) {
    evaluation.stepName = evaluationStepName;
  }

  newState.evaluatorFeedback = [...(state.evaluatorFeedback || []), evaluation];

  return { newState, evaluation };
}

// ============================================================================
// INITIAL STATE CREATOR
// ============================================================================
export function createInitialPipelineState(
  consortium: ConsortiumPartner[],
  idea: ProjectIdea,
  configuration?: PipelineState['configuration'],
  originalConcept?: SavedConcept
): PipelineState {
  const actionType = configuration?.actionType || idea.actionType || 'KA220';
  const wpCount = configuration?.wpCount || 5;
  const dynamicSteps = getPipelineSteps(wpCount, actionType);

  // Extract WP configurations from concept if available
  let wpConfigurations: PipelineState['wpConfigurations'] = undefined;

  if (originalConcept?.workPackages && originalConcept.workPackages.length > 0) {
    console.log(`[createInitialPipelineState] Extracting ${originalConcept.workPackages.length} WP configurations from concept`);

    wpConfigurations = originalConcept.workPackages.map((wp, idx) => {
      // Try to find matching partner for lead
      const leadPartner = consortium.find(p =>
        p.name.toLowerCase().includes(wp.lead?.toLowerCase() || '') ||
        wp.lead?.toLowerCase().includes(p.name.toLowerCase())
      );

      return {
        wpNumber: wp.number || (idx + 1),
        type: wp.type || (idx === 0 ? 'MANAGEMENT' : 'DEVELOPMENT'),
        title: wp.title,
        titleDE: wp.titleDE || wp.title,
        leadPartnerId: leadPartner?.id || (idx === 0 ? consortium[0]?.id : consortium[idx % consortium.length]?.id) || '',
        selectedActivities: wp.activities || [],
        selectedDeliverables: wp.deliverables || [],
        budgetPercent: wp.budgetPercent || Math.round(100 / originalConcept.workPackages.length),
        duration: wp.duration || { start: 1, end: 24 },
        objectives: []
      };
    });

    console.log(`[createInitialPipelineState] WP Configurations created: `, wpConfigurations.map(w => `WP${w.wpNumber}: ${w.title} (${w.type}, ${w.budgetPercent}%)`));
  }

  return {
    consortium,
    idea,
    originalConcept,
    wpConfigurations,
    projectTitle: idea.title || originalConcept?.title,
    acronym: idea.acronym || originalConcept?.acronym,
    configuration: {
      totalBudget: configuration?.totalBudget || 250000,
      wpCount,
      actionType,
      duration: configuration?.duration || (originalConcept as any)?.duration || 24,
    },
    currentStep: 0,
    totalSteps: dynamicSteps.length,
    evaluatorFeedback: [],
    answers: {}
  };
}
