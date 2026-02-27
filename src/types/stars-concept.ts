/**
 * STARS EXPOSÉ TYPES
 * ==================
 * Types for the STARS-style professional project exposé mode.
 * Follows the 6-section STARS document structure:
 * Section 1: Project Identification
 * Section 2: Project Partnership
 * Section 3: Project Summary (Challenge → Opportunity → Response)
 * Section 4: Project Goals (with Rationale)
 * Section 5: Target Groups (4-level hierarchy)
 * Section 6: Methodological Approach (named principles)
 */

import { ResearchSource, SelectedPartner } from './concept';

// ============================================================================
// STARS CONCEPT PROPOSAL (3 alternative concepts for user selection)
// ============================================================================

export interface StarsConceptProposal {
    id: string;
    title: string;           // English project title
    acronym: string;         // Creative English acronym
    summary: string;         // 3-5 sentences describing the approach
    approach: string;        // Core intervention strategy
    innovation: string;      // What's unique about this concept
    mainOutputs: string[];   // Key deliverables
    euPolicyAlignment: string[];  // Auto-detected EU policy areas
    selected: boolean;
}

// ============================================================================
// STARS-SPECIFIC DATA TYPES
// ============================================================================

export interface StarsGoal {
    id: string;
    number: number;        // G1, G2, G3...
    statement: string;     // What the goal is
    rationale: string;     // WHY this goal matters (the key differentiator from SMART)
    measurableOutcome: string; // Concrete measurable result
}

export type TargetGroupLevel = 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | 'QUATERNARY';

export const TARGET_GROUP_LEVEL_LABELS: Record<TargetGroupLevel, { en: string; de: string }> = {
    PRIMARY: { en: 'Primary', de: 'Primär' },
    SECONDARY: { en: 'Secondary', de: 'Sekundär' },
    TERTIARY: { en: 'Tertiary', de: 'Tertiär' },
    QUATERNARY: { en: 'Quaternary', de: 'Quartär' },
};

export interface StarsTargetGroup {
    id: string;
    level: TargetGroupLevel;
    name: string;                    // e.g. "NGO Staff and Managers"
    description: string;             // Who they are
    characteristicsAndNeeds: string; // Their specific traits and needs
    roleInProject: string;           // How they participate
    estimatedReach: string;          // e.g. "100+ directly engaged"
}

export interface StarsMethodPrinciple {
    id: string;
    name: string;          // e.g. "Co-Design with End-Users"
    description: string;   // 60-100 word narrative paragraph
}

export interface StarsAssociatedPartner {
    id: string;
    description: string;   // e.g. "3-5 NGOs from different EU/candidate countries"
    country: string;       // "Various"
    role: string;          // "End-users, testers, dissemination multipliers"
}

// ============================================================================
// STARS CONCEPT STATE (mirrors ConceptState structure)
// ============================================================================

export interface StarsConceptState {
    // Step 1: Project Frame & Idea
    idea: string;
    enhancedIdea: string;
    targetGroup: string;
    problem: string;
    enhancedProblem: string;
    sector: string;              // 'ADU' | 'VET' | 'SCH' | 'YOU' | 'HED'
    actionType: string;          // 'KA210' | 'KA220'
    budgetTier?: number;
    duration?: number;           // months
    priorityFocus: string;
    isEnhanced: boolean;
    researchPromptsGenerated: boolean;

    // STARS-specific Step 1 fields
    projectTitle: string;        // Final English title
    projectAcronym: string;      // Final English acronym
    euPolicyAlignment: string[]; // e.g. ["Digital Transformation", "Social Economy"]

    // Step 2: Research & Sources + Concept Proposals
    sources: ResearchSource[];
    conceptProposals: StarsConceptProposal[];
    selectedConceptId: string | null;
    conceptsGenerated: boolean;
    isGeneratingConcepts: boolean;
    conceptError?: string;

    // Step 3: Partnership
    selectedPartners: SelectedPartner[];
    partnerSearchQuery: string;
    partnershipNarrative: string;
    isGeneratingPartnershipNarrative: boolean;
    partnershipNarrativeError?: string;
    associatedPartners: StarsAssociatedPartner[];

    // Step 4: Project Core — the STARS sections
    // 4.1 The Challenge (Section 3.1)
    challengeNarrative: string;
    isGeneratingChallenge: boolean;
    challengeError?: string;

    // 4.2 The Opportunity (Section 3.2)
    opportunityNarrative: string;
    isGeneratingOpportunity: boolean;
    opportunityError?: string;

    // 4.3 The Project Response (Section 3.3)
    projectResponse: string;
    isGeneratingResponse: boolean;
    responseError?: string;

    // 4.4 Project Goals (Section 4)
    goals: StarsGoal[];
    isGeneratingGoals: boolean;
    goalsError?: string;

    // 4.5 Target Groups (Section 5)
    starsTargetGroups: StarsTargetGroup[];
    isGeneratingTargetGroups: boolean;
    targetGroupsError?: string;

    // 4.6 Methodological Approach (Section 6)
    methodPrinciples: StarsMethodPrinciple[];
    isGeneratingMethodology: boolean;
    methodologyError?: string;

    // Step 5: Full Exposé
    fullExpose: string | null;   // Assembled markdown document
    isGeneratingExpose: boolean;
    isTranslatingExpose: boolean;
    exposeError?: string;
    additionalInstructions?: string;

    // Step 5b: Revision Mode (post-evaluation)
    evaluatorFeedback: string;          // Pasted evaluator feedback
    isRevisingExpose: boolean;          // Loading state for revision
    revisionError?: string;             // Error from revision attempt
    revisionCount: number;              // How many revisions have been applied
}

// ============================================================================
// STARS DATA BUNDLE (for saving in SavedConcept/Project)
// ============================================================================

export interface StarsData {
    challengeNarrative: string;
    opportunityNarrative: string;
    projectResponse: string;
    goals: StarsGoal[];
    starsTargetGroups: StarsTargetGroup[];
    methodPrinciples: StarsMethodPrinciple[];
    partnershipNarrative: string;
    associatedPartners: StarsAssociatedPartner[];
    euPolicyAlignment: string[];
    fullExpose: string;
}

// ============================================================================
// EU POLICY ALIGNMENT OPTIONS
// ============================================================================

export const EU_POLICY_OPTIONS = [
    { id: 'DIGITAL_TRANSFORMATION', label: 'Digital Transformation', labelDE: 'Digitale Transformation' },
    { id: 'SOCIAL_ECONOMY', label: 'Social Economy', labelDE: 'Sozialwirtschaft' },
    { id: 'CIVIL_SOCIETY_RESILIENCE', label: 'Civil Society Resilience', labelDE: 'Resilienz der Zivilgesellschaft' },
    { id: 'INCLUSION_DIVERSITY', label: 'Inclusion and Diversity', labelDE: 'Inklusion und Vielfalt' },
    { id: 'GREEN_TRANSITION', label: 'Green Transition', labelDE: 'Grüner Wandel' },
    { id: 'EUROPEAN_EDUCATION_AREA', label: 'European Education Area', labelDE: 'Europäischer Bildungsraum' },
    { id: 'DIGITAL_EDUCATION_ACTION_PLAN', label: 'Digital Education Action Plan', labelDE: 'Aktionsplan für digitale Bildung' },
    { id: 'SKILLS_AGENDA', label: 'European Skills Agenda', labelDE: 'Europäische Kompetenzagenda' },
    { id: 'YOUTH_STRATEGY', label: 'EU Youth Strategy', labelDE: 'EU-Jugendstrategie' },
    { id: 'DEMOCRATIC_PARTICIPATION', label: 'Democratic Participation', labelDE: 'Demokratische Teilhabe' },
];
