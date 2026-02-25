import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ConceptState } from '@/types/concept';

// We extend ConceptState with the current UI step so we can save/restore where the user was
export interface ConceptStoreState extends ConceptState {
    currentStep: number;
}

export interface ConceptStoreActions {
    updateField: <K extends keyof ConceptStoreState>(key: K, value: ConceptStoreState[K]) => void;
    updateState: (updates: Partial<ConceptStoreState>) => void;
    setCurrentStep: (step: number) => void;
    resetState: () => void;
}

export type ConceptStore = ConceptStoreState & ConceptStoreActions;

export const initialConceptState: ConceptStoreState = {
    currentStep: 1,

    // Step 1: Idea
    idea: '',
    enhancedIdea: '',
    targetGroup: '',
    problem: '',
    enhancedProblem: '',
    sector: 'ADU',
    actionType: 'KA220',
    budgetTier: 250000,
    duration: 24,
    priorityFocus: '',
    isEnhanced: false,
    researchPromptsGenerated: false,

    // Step 2: Research & Concepts
    sources: [],
    concepts: [],
    selectedConceptId: null,
    conceptsGenerated: false,
    conceptError: undefined,
    isComparingConcepts: false,
    conceptComparisonResult: null,
    compareConceptsError: undefined,

    // Step 3: Consortium
    selectedPartners: [],
    partnerSearchQuery: '',

    // Step 4: Objectives
    objectives: [],
    selectedObjectiveIds: [],
    objectivesGenerated: false,
    objectivesError: undefined,
    regeneratingObjectiveId: null,

    // Step 5: WP Structure
    wpSuggestions: [],
    selectedWpNumbers: [],
    wpGenerated: false,
    wpError: undefined,

    // Step 6: Detailed Concept
    detailedConcept: null,
    isGeneratingDetailedConcept: false,
    additionalInstructions: '',
    isTranslatingConcept: false,
    detailedConceptError: undefined,
};

export const useConceptStore = create<ConceptStore>()(
    persist(
        (set) => ({
            ...initialConceptState,

            updateField: (key, value) => set((state) => ({ ...state, [key]: value })),

            updateState: (updates) => set((state) => ({ ...state, ...updates })),

            setCurrentStep: (step: number) => set({ currentStep: step }),

            resetState: () => set(initialConceptState),
        }),
        {
            name: 'erasmus-concept-developer-draft-v1', // unique name
            storage: createJSONStorage(() => localStorage), // use localStorage for auto-save
            // specify which fields we DO NOT want to persist (like loading states)
            partialize: (state) => ({
                ...state,
                isComparingConcepts: false,
                isGeneratingDetailedConcept: false,
                isTranslatingConcept: false,
                regeneratingObjectiveId: null,
                // Make sure transient errors aren't permanently saved
                conceptError: undefined,
                compareConceptsError: undefined,
                objectivesError: undefined,
                wpError: undefined,
                detailedConceptError: undefined,
            }),
        }
    )
);
