export interface SourceStatistic {
    metric: string;      // e.g., "dropout rate among rural youth"
    value: string;       // e.g., "34.2%"
    context: string;     // e.g., "across 12 EU member states, 2019-2022"
    citation?: string;   // e.g., "CEDEFOP, 2023"
}

export interface ResearchSource {
    id: string;
    title: string;
    content: string;
    type: 'study' | 'report' | 'article' | 'other';
    fileType?: string;
    // Analysis results — structured for citation in downstream prompts
    summary?: string;
    keyFindings?: string[];
    statistics?: SourceStatistic[];       // Hard data: numbers, percentages, metrics
    quotableData?: string[];              // Direct quotable passages with data/evidence
    sourceInfo?: {                        // Citation metadata
        authors?: string;
        year?: string;
        institution?: string;
    };
    isAnalyzed: boolean;
    isAnalyzing: boolean;
    isExtracting: boolean;
    error?: string;
}

export interface ConceptProposal {
    id: string;
    title: string;
    acronym: string;
    summary: string;
    problemStatement: string;
    innovation: string;
    targetGroups: string[];
    objectives: string[];
    mainOutputs: string[];
    erasmusPriorities: string[];
    selected: boolean;
    savedForLater: boolean;
    expanded?: boolean;
    consortiumFit?: string;
}

export interface SelectedPartner {
    partnerId: string;
    role: 'COORDINATOR' | 'PARTNER';
}

export interface SmartObjective {
    id: string;
    text: string;
    indicators: string[];
    sources: string[];
    erasmusPriority?: string;
}

export interface WPSuggestion {
    number: number;
    title: string;
    type: string;
    description: string;
    activities: string[];
    deliverables: string[];
    duration: { start: number; end: number };
    lead: string;
}

export interface ConceptState {
    // Step 1: Idea
    idea: string;
    enhancedIdea: string;
    targetGroup: string;
    problem: string;
    enhancedProblem: string;
    sector: string;
    actionType: string;
    budgetTier?: number;
    duration?: number;
    priorityFocus: string;
    isEnhanced: boolean;
    researchPromptsGenerated: boolean;

    // Step 2: Research & Concepts
    sources: ResearchSource[];
    concepts: ConceptProposal[];
    selectedConceptId: string | null;
    conceptsGenerated: boolean;
    conceptError?: string;
    isComparingConcepts: boolean;
    conceptComparisonResult: any | null;
    compareConceptsError?: string;

    // Step 3: Consortium
    selectedPartners: SelectedPartner[];
    partnerSearchQuery: string;

    // Step 4: Objectives
    objectives: SmartObjective[];
    selectedObjectiveIds: string[];
    objectivesGenerated: boolean;
    objectivesError?: string;
    regeneratingObjectiveId?: string | null;

    // Step 5: WP Structure
    wpSuggestions: WPSuggestion[];
    selectedWpNumbers: number[];
    wpGenerated: boolean;
    wpError?: string;

    // Step 6: Detailed Concept
    detailedConcept: string | null;
    isGeneratingDetailedConcept: boolean;
    additionalInstructions?: string;
    isTranslatingConcept?: boolean;
    detailedConceptError?: string;
}
