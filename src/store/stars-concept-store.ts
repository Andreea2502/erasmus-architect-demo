import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { StarsConceptState } from '@/types/stars-concept';

// Extend with UI step tracking
export interface StarsConceptStoreState extends StarsConceptState {
    currentStep: number;
}

export interface StarsConceptStoreActions {
    updateField: <K extends keyof StarsConceptStoreState>(key: K, value: StarsConceptStoreState[K]) => void;
    updateState: (updates: Partial<StarsConceptStoreState>) => void;
    setCurrentStep: (step: number) => void;
    resetState: () => void;
}

export type StarsConceptStore = StarsConceptStoreState & StarsConceptStoreActions;

export const initialStarsState: StarsConceptStoreState = {
    currentStep: 1,

    // Step 1: Project Frame & Idea
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
    projectTitle: '',
    projectAcronym: '',
    euPolicyAlignment: [],

    // Step 2: Research & Sources
    sources: [],

    // Step 3: Partnership
    selectedPartners: [],
    partnerSearchQuery: '',
    partnershipNarrative: '',
    isGeneratingPartnershipNarrative: false,
    partnershipNarrativeError: undefined,
    associatedPartners: [],

    // Step 4: Project Core
    challengeNarrative: '',
    isGeneratingChallenge: false,
    challengeError: undefined,
    opportunityNarrative: '',
    isGeneratingOpportunity: false,
    opportunityError: undefined,
    projectResponse: '',
    isGeneratingResponse: false,
    responseError: undefined,
    goals: [],
    isGeneratingGoals: false,
    goalsError: undefined,
    starsTargetGroups: [],
    isGeneratingTargetGroups: false,
    targetGroupsError: undefined,
    methodPrinciples: [],
    isGeneratingMethodology: false,
    methodologyError: undefined,

    // Step 5: Full Exposé
    fullExpose: null,
    isGeneratingExpose: false,
    isTranslatingExpose: false,
    exposeError: undefined,
    additionalInstructions: '',
};

export const useStarsConceptStore = create<StarsConceptStore>()(
    persist(
        (set) => ({
            ...initialStarsState,

            updateField: (key, value) => set((state) => ({ ...state, [key]: value })),

            updateState: (updates) => set((state) => ({ ...state, ...updates })),

            setCurrentStep: (step: number) => set({ currentStep: step }),

            resetState: () => set(initialStarsState),
        }),
        {
            name: 'erasmus-stars-expose-draft-v1',
            storage: createJSONStorage(() => localStorage),
            // Exclude loading states and transient errors from persistence
            partialize: (state) => ({
                ...state,
                isGeneratingPartnershipNarrative: false,
                isGeneratingChallenge: false,
                isGeneratingOpportunity: false,
                isGeneratingResponse: false,
                isGeneratingGoals: false,
                isGeneratingTargetGroups: false,
                isGeneratingMethodology: false,
                isGeneratingExpose: false,
                isTranslatingExpose: false,
                // Clear errors on save
                partnershipNarrativeError: undefined,
                challengeError: undefined,
                opportunityError: undefined,
                responseError: undefined,
                goalsError: undefined,
                targetGroupsError: undefined,
                methodologyError: undefined,
                exposeError: undefined,
            }),
        }
    )
);
