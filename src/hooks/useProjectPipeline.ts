import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguageStore } from '@/store/language-store';
import { useAppStore } from '@/store/app-store';
import { useTranslation } from '@/lib/i18n';
import { vectorStore, type UploadedDocument } from '@/lib/rag-system';
import type { UploadedStudy } from '@/components/knowledge/StudyManager';
import type { ProjectKnowledgePool as KnowledgePoolType } from '@/store/types';
import {
    PipelineState,
    ConsortiumPartner,
    ProjectIdea,
    createInitialPipelineState
} from '@/lib/project-pipeline';
import type { WPConfiguration } from '@/components/pipeline/WorkPackageConfigurator';
import type { WPBudgetConfig } from '@/components/pipeline/WPBudgetConfigurator';
import {
    analyzePartnerForRole,
    analyzeConsortium,
    CONSORTIUM_ROLES,
    type PartnerRoleAssignment,
    type ConsortiumAnalysis as ConsortiumAnalysisType,
} from '@/lib/consortium-integration';
import { generateGuideAnswer } from '@/lib/ai-service';

export function useProjectPipeline(initialProjectId?: string) {
    const { language, setLanguage } = useLanguageStore();
    const { t } = useTranslation(language);
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);

    // CRM Partners and Projects from Store
    const isHydrated = useAppStore((state) => state.isHydrated);
    const crmPartners = useAppStore((state) => state.partners);
    const projects = useAppStore((state) => state.projects);
    const addProject = useAppStore((state) => state.addProject);
    const updateProject = useAppStore((state) => state.updateProject);

    // Current project being edited (for persistence)
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

    // Pending project load (waits for store rehydration from IndexedDB)
    const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
    const [fromConcept, setFromConcept] = useState(false);

    // Pipeline State
    const [pipelineState, setPipelineState] = useState<PipelineState | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAutoRunning, setIsAutoRunning] = useState(false);
    const [currentStatus, setCurrentStatus] = useState('');

    // Setup Phase
    const [setupPhase, setSetupPhase] = useState<'idea' | 'consortium' | 'documents' | 'workpackages' | 'ready'>('idea');

    // Idea Input
    const [ideaDescription, setIdeaDescription] = useState('');
    const [mainObjective, setMainObjective] = useState('');
    const [targetGroups, setTargetGroups] = useState<string[]>([]);
    const [sector, setSector] = useState<'ADU' | 'VET' | 'SCH' | 'YOU'>('ADU');
    const [actionType, setActionType] = useState<'KA220' | 'KA210'>('KA220');

    // Configuration (Budget & Structure)
    const [totalBudget, setTotalBudget] = useState(250000);
    const [wpCount, setWpCount] = useState(5);

    // Consortium - selected from CRM or added via URL
    const [selectedCrmPartners, setSelectedCrmPartners] = useState<string[]>([]);
    const [manualPartners, setManualPartners] = useState<ConsortiumPartner[]>([]);
    const [newPartnerUrl, setNewPartnerUrl] = useState('');
    const [isLoadingPartner, setIsLoadingPartner] = useState(false);

    // AI Suggestions
    const [suggestedPartners, setSuggestedPartners] = useState<string[]>([]);
    const [partnerSuggestionDetails, setPartnerSuggestionDetails] = useState<Record<string, { reason: string; suggestedRole: string; matchScore: number }>>({});
    const [consortiumAnalysis, setConsortiumAnalysis] = useState<{ coverageAssessment: string; missingExpertise: string[]; geographicSpread: string; overallScore: number } | null>(null);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    // Partner Role Assignments (intelligent role assignment based on concept)
    const [partnerRoleAssignments, setPartnerRoleAssignments] = useState<Record<string, PartnerRoleAssignment>>({});
    const [detailedConsortiumAnalysis, setDetailedConsortiumAnalysis] = useState<ConsortiumAnalysisType | null>(null);
    const [coordinatorId, setCoordinatorId] = useState<string | null>(null);

    // Documents
    const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');

    // Studies with AI summaries
    const [uploadedStudies, setUploadedStudies] = useState<UploadedStudy[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Project-specific Knowledge Pool
    const [projectKnowledgePool, setProjectKnowledgePool] = useState<KnowledgePoolType>({
        documents: [],
        websites: [],
        notes: [],
    });

    // Work Package Configuration
    const [wpConfigurations, setWpConfigurations] = useState<WPConfiguration[]>([]);
    const [wpBudgetConfigs, setWpBudgetConfigs] = useState<WPBudgetConfig[]>([]);
    const [generatingWPNumber, setGeneratingWPNumber] = useState<number | null>(null);

    // Note viewing/editing
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

    // Sync knowledge pool to pipeline state whenever it changes
    useEffect(() => {
        if (pipelineState && projectKnowledgePool) {
            const currentDocs = pipelineState.knowledgePool?.documents?.length || 0;
            const newDocs = projectKnowledgePool.documents?.length || 0;
            const currentSites = pipelineState.knowledgePool?.websites?.length || 0;
            const newSites = projectKnowledgePool.websites?.length || 0;
            const currentNotes = pipelineState.knowledgePool?.notes?.length || 0;
            const newNotes = projectKnowledgePool.notes?.length || 0;

            if (currentDocs !== newDocs || currentSites !== newSites || currentNotes !== newNotes) {
                setPipelineState(prev => prev ? { ...prev, knowledgePool: projectKnowledgePool } : prev);
            }
        }
    }, [projectKnowledgePool, pipelineState?.knowledgePool?.documents?.length, pipelineState?.knowledgePool?.websites?.length, pipelineState?.knowledgePool?.notes?.length]);

    // Safety Reset Function
    const handleSafetyReset = () => {
        setIsGenerating(false);
        setIsAutoRunning(false);
        setIsImproving(false);
        setIsLoadingSuggestions(false);
        setIsLoadingPartner(false);
        setErrorMessage(null);
        setCurrentStatus('');
    };

    // UI State
    const [expandedStep, setExpandedStep] = useState<number | null>(null);
    const [showCrmPartners, setShowCrmPartners] = useState(true);

    // Project saved state
    const [projectSaved, setProjectSaved] = useState(false);

    // Edit mode state
    const [editingStep, setEditingStep] = useState<number | null>(null);
    const [editInstruction, setEditInstruction] = useState('');
    const [isImproving, setIsImproving] = useState(false);

    // State for per-question editing
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
    const [questionEditMode, setQuestionEditMode] = useState<Record<string, 'ai' | 'manual'>>({});
    const [questionEditText, setQuestionEditText] = useState<Record<string, string>>({});
    const [questionImproveInstruction, setQuestionImproveInstruction] = useState<Record<string, string>>({});
    const [generatingQuestionId, setGeneratingQuestionId] = useState<string | null>(null);
    const [showImproveInput, setShowImproveInput] = useState<Record<string, boolean>>({});
    const [showDocumentPicker, setShowDocumentPicker] = useState<Record<string, boolean>>({});
    const [questionDocuments, setQuestionDocuments] = useState<Record<string, string[]>>({});
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    // Preview State for AI Improvements
    const [previewContent, setPreviewContent] = useState<Record<number, any>>({});

    // Question Feedback State
    const [questionFeedback, setQuestionFeedback] = useState<Record<string, {
        score: number;
        improvements: Array<{
            issue: string;
            location: string;
            suggestion: string;
            improvedText: string;
            selected?: boolean;
        }>;
        strengths?: string[];
        weaknesses?: string[];
        missingAspects?: string[];
        improvedAnswer?: string;
    }>>({});
    const [isAnalyzingQuestion, setIsAnalyzingQuestion] = useState<string | null>(null);

    // Change tracking for visual diff highlighting
    const [previousAnswers, setPreviousAnswers] = useState<Record<string, string>>({});
    const [recentlyChangedQuestions, setRecentlyChangedQuestions] = useState<Set<string>>(new Set());
    const [showPreviousVersion, setShowPreviousVersion] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setMounted(true);
        setUploadedDocs(vectorStore.getDocuments());

        // Load knowledge base for pipeline generation
        import('@/lib/knowledge-loader').then(({ loadKnowledgeBase }) => {
            loadKnowledgeBase(actionType, (status, progress) => {
                console.log(`[KnowledgeLoader] ${status} (${progress}%)`);
            });
        });

        // Use the proper Next.js searchParams to reliably get data after router.push
        const projectIdFromUrl = searchParams.get('project') || searchParams.get('projectId') || initialProjectId;
        const isFromConcept = searchParams.get('fromConcept') === 'true';

        if (projectIdFromUrl) {
            setFromConcept(isFromConcept);
            setPendingProjectId(projectIdFromUrl);
        }
    }, [initialProjectId, actionType, searchParams]);

    // Load existing project into generator
    const loadProjectIntoGenerator = (projectId: string, fromConcept: boolean = false) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        console.log(`[Generator] Loading project: ${project.title} (fromConcept: ${fromConcept})`);
        setCurrentProjectId(projectId);

        if (project.knowledgePool) {
            setProjectKnowledgePool(project.knowledgePool);
        }

        // When coming from Concept Developer export (fromConcept=true), ALWAYS rebuild from
        // fresh project data so that the latest budget, duration, partners, and concept title
        // are reflected. Only restore saved generatorState for direct navigation back.
        if (project.generatorState && !fromConcept) {
            setPipelineState({
                ...project.generatorState,
                knowledgePool: project.knowledgePool || project.generatorState.knowledgePool,
            });
            setSetupPhase('ready');
            setProjectSaved(true);
            console.log(`[Generator] Restored saved generator state`);
        } else {
            const projectConsortium: ConsortiumPartner[] = (project.consortium || []).map(c => {
                const partner = crmPartners.find(p => p.id === c.partnerId);
                return {
                    id: c.partnerId,
                    crmId: partner?.id,
                    name: partner?.organizationName || 'Unknown',
                    country: partner?.country || 'Unknown',
                    type: (partner?.organizationType as ConsortiumPartner['type']) || 'SME',
                    expertise: partner?.expertiseAreas?.map(e => e.domain) || [],
                    targetGroups: partner?.targetGroups?.map(t => t.group) || [],
                    previousProjects: partner?.previousProjects || [],
                    isLead: c.role === 'COORDINATOR',
                    generatedDescriptions: partner?.generatedDescriptions?.map(d => ({ title: d.title, content: d.content })),
                    uploadedDocuments: partner?.uploadedDocuments?.map(d => ({ name: d.name, type: d.type, description: d.description }))
                };
            });

            const projectIdea: ProjectIdea = {
                title: project.title,
                acronym: project.acronym || '',
                shortDescription: project.problemStatement || project.title,
                // Use real problem statement so AI has genuine project context
                mainObjective: project.problemStatement || project.title || 'Erasmus+ Projekt',
                targetGroups: project.targetGroups?.map(t => t.name) || [],
                sector: project.sector,
                actionType: project.actionType,
            };

            const initialState = createInitialPipelineState(projectConsortium, projectIdea, {
                totalBudget: project.budgetTier,
                wpCount: project.workPackages?.length || (project.originalConcept?.workPackages?.length) || 5,
                actionType: project.actionType,
                duration: project.duration,
            }, project.originalConcept);

            setPipelineState(initialState);
            setSetupPhase('ready');
            console.log(`[Generator] Built fresh state from project data: ${projectConsortium.length} partners, €${project.budgetTier}, ${project.duration}m`);
        }
    };

    useEffect(() => {
        if (!isHydrated || !pendingProjectId || currentProjectId) return;

        const project = projects.find(p => p.id === pendingProjectId);
        if (project) {
            loadProjectIntoGenerator(pendingProjectId, fromConcept);
            setPendingProjectId(null);
        }
    }, [isHydrated, projects, pendingProjectId, currentProjectId, fromConcept]);

    const allPartners: ConsortiumPartner[] = [
        ...crmPartners
            .filter(p => selectedCrmPartners.includes(p.id))
            .map((p) => {
                const roleAssignment = partnerRoleAssignments[p.id];
                const isCoordinator = coordinatorId === p.id || roleAssignment?.suggestedRole === 'COORDINATOR';
                return {
                    id: p.id,
                    crmId: p.id,
                    name: p.organizationName,
                    country: p.country,
                    type: p.organizationType,
                    expertise: p.expertiseAreas?.map(e => e.domain) || [],
                    targetGroups: p.targetGroups?.map(t => t.group) || [],
                    previousProjects: p.previousProjects || [],
                    isLead: isCoordinator,
                    role: roleAssignment
                        ? CONSORTIUM_ROLES.find(r => r.role === roleAssignment.suggestedRole)?.labelDE || 'Projektpartner'
                        : 'Projektpartner',
                    generatedDescriptions: p.generatedDescriptions?.map(d => ({ title: d.title, content: d.content })),
                    uploadedDocuments: p.uploadedDocuments?.map(d => ({
                        name: d.name,
                        type: d.type,
                        description: d.description,
                        summary: (d as any).summary
                    }))
                };
            }),
        ...manualPartners,
    ];

    const saveGeneratorStateToProject = (stateToSave?: PipelineState) => {
        const state = stateToSave || pipelineState;
        if (!state) return;

        const formatDuration = (d: any) => typeof d === 'object' && d ? { start: d.start || 1, end: d.end || 12 } : { start: 1, end: 12 };

        const commonData = {
            title: state.projectTitle || state.idea.shortDescription,
            acronym: state.acronym || '',
            problemStatement: state.needsAnalysis?.problemStatement || '',
            rootCauses: state.needsAnalysis?.gaps || [],
            objectives: state.objectives ? [
                {
                    id: crypto.randomUUID(),
                    code: 'GO',
                    type: 'GENERAL' as const,
                    description: state.objectives.generalObjective,
                    indicators: [],
                },
                ...state.objectives.specificObjectives.map((so: any, idx: number) => ({
                    id: crypto.randomUUID(),
                    code: so.id || `SO${idx + 1}`,
                    type: 'SPECIFIC' as const,
                    description: so.description,
                    indicators: so.indicators || [],
                })),
            ] : [],
            workPackages: state.workPackages?.map((wp: any) => {
                const wpDuration = formatDuration(wp.duration);
                return {
                    id: crypto.randomUUID(),
                    number: wp.number,
                    title: wp.title,
                    objectives: typeof wp.objectives === 'string' ? wp.objectives : (wp.objectives || []).join('. '),
                    description: typeof wp.objectives === 'string' ? wp.objectives : (wp.objectives || []).join('. '),
                    startMonth: wpDuration.start,
                    endMonth: wpDuration.end,
                    leadPartner: allPartners.find(p => p.name === wp.lead)?.id || allPartners[0]?.id || '',
                    activities: wp.activities?.map((a: any, aIdx: number) => {
                        const actMonth = formatDuration(a.month);
                        return {
                            id: crypto.randomUUID(),
                            code: `A${wp.number}.${aIdx + 1}`,
                            title: a.title,
                            description: a.description || a.content || '',
                            startMonth: actMonth.start,
                            endMonth: actMonth.end,
                            leadPartner: allPartners[0]?.id || '',
                        };
                    }) || [],
                    deliverables: wp.deliverables?.map((d: any) => ({
                        id: crypto.randomUUID(),
                        code: d.id,
                        title: d.title,
                        type: (d.type?.toString().toUpperCase() === 'REPORT' ? 'REPORT' : d.type?.toString().toUpperCase() === 'TOOL' ? 'TOOL' : 'OTHER') as 'REPORT' | 'TOOL' | 'CURRICULUM' | 'GUIDE' | 'OTHER',
                        dueMonth: d.dueMonth,
                        description: d.title,
                    })) || [],
                };
            }) || [],
            results: state.impact?.expectedImpact ? [{
                id: crypto.randomUUID(),
                title: 'Expected Impact',
                description: state.impact.expectedImpact,
                type: 'INTANGIBLE' as const,
                indicators: state.impact.quantitativeIndicators?.map((i: any) => i.indicator) || []
            }] : [],
            generatorState: state,
            lastGeneratorUpdate: new Date(),
            knowledgePool: projectKnowledgePool,
        };

        if (currentProjectId) {
            updateProject(currentProjectId, commonData as any);
            setProjectSaved(true);
        } else {
            const newProjectId = addProject({
                ...commonData,
                status: 'IN_PROGRESS',
                actionType: state.idea.actionType,
                sector: state.idea.sector,
                budgetTier: state.configuration?.totalBudget || 250000,
                duration: state.configuration?.duration || 24,
                callYear: new Date().getFullYear(),
                horizontalPriorities: [],
                statistics: [],
                targetGroups: [],
                consortium: [],
                disseminationChannels: [],
                multiplierEvents: [],
                knowledgePool: projectKnowledgePool,
            } as any);
            setCurrentProjectId(newProjectId);
            setProjectSaved(true);
        }
    };

    const analyzeConsortiumRoles = () => {
        if (selectedCrmPartners.length === 0 && manualPartners.length === 0) return;
        if (!ideaDescription) return;

        const idea: ProjectIdea = {
            shortDescription: ideaDescription,
            mainObjective: mainObjective || ideaDescription,
            targetGroups,
            sector,
            actionType
        };

        const selectedPartners = crmPartners.filter(p => selectedCrmPartners.includes(p.id));
        const assignments: Record<string, PartnerRoleAssignment> = {};
        const existingAssignments: PartnerRoleAssignment[] = [];

        for (const partner of selectedPartners) {
            const assignment = analyzePartnerForRole(partner, idea, undefined, existingAssignments);
            assignments[partner.id] = assignment;
            existingAssignments.push(assignment);
        }

        setPartnerRoleAssignments(assignments);

        const coordinatorAssignment = Object.entries(assignments).find(([_, a]) => a.suggestedRole === 'COORDINATOR');
        if (coordinatorAssignment) {
            setCoordinatorId(coordinatorAssignment[0]);
        } else if (selectedPartners.length > 0 && !coordinatorId) {
            setCoordinatorId(selectedPartners[0].id);
        }

        const fullAnalysis = analyzeConsortium(selectedPartners, idea);
        setDetailedConsortiumAnalysis(fullAnalysis);
    };

    // Programme Guide Chat State
    const [showGuideChat, setShowGuideChat] = useState(false);
    const [guideQuery, setGuideQuery] = useState('');
    const [guideMessages, setGuideMessages] = useState<{ role: 'user' | 'assistant', content: string, sources?: any[] }[]>([
        { role: 'assistant', content: t('chatWelcome') }
    ]);
    const [isGuideThinking, setIsGuideThinking] = useState(false);

    const handleAskGuide = async () => {
        if (!guideQuery.trim()) return;

        const userMsg = guideQuery;
        setGuideQuery('');
        setGuideMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsGuideThinking(true);

        try {
            // 1. Search in Vector Store (Programme Guide only)
            const ragResult = await vectorStore.queryRag(userMsg, 3, 0.5, ['programme_guide']);

            // 2. Generate Answer
            const answer = await generateGuideAnswer(userMsg, ragResult.context, language);

            setGuideMessages(prev => [...prev, {
                role: 'assistant',
                content: answer,
                sources: ragResult.sources
            }]);
        } catch (error) {
            console.error('Guide Chat Error:', error);
            setGuideMessages(prev => [...prev, { role: 'assistant', content: language === 'de' ? 'Entschuldigung, ich konnte keine Antwort finden.' : 'Sorry, I could not find an answer.' }]);
        } finally {
            setIsGuideThinking(false);
        }
    };

    return {
        language, setLanguage, t, mounted, setMounted,
        crmPartners, projects, addProject, updateProject,
        currentProjectId, setCurrentProjectId,
        pendingProjectId, setPendingProjectId,
        fromConcept, setFromConcept,
        pipelineState, setPipelineState,
        isGenerating, setIsGenerating,
        isAutoRunning, setIsAutoRunning,
        currentStatus, setCurrentStatus,
        setupPhase, setSetupPhase,
        ideaDescription, setIdeaDescription,
        mainObjective, setMainObjective,
        targetGroups, setTargetGroups,
        sector, setSector,
        actionType, setActionType,
        totalBudget, setTotalBudget,
        wpCount, setWpCount,
        selectedCrmPartners, setSelectedCrmPartners,
        manualPartners, setManualPartners,
        newPartnerUrl, setNewPartnerUrl,
        isLoadingPartner, setIsLoadingPartner,
        suggestedPartners, setSuggestedPartners,
        partnerSuggestionDetails, setPartnerSuggestionDetails,
        consortiumAnalysis, setConsortiumAnalysis,
        isLoadingSuggestions, setIsLoadingSuggestions,
        partnerRoleAssignments, setPartnerRoleAssignments,
        detailedConsortiumAnalysis, setDetailedConsortiumAnalysis,
        coordinatorId, setCoordinatorId,
        uploadedDocs, setUploadedDocs,
        isUploading, setIsUploading,
        uploadProgress, setUploadProgress,
        uploadStatus, setUploadStatus,
        uploadedStudies, setUploadedStudies,
        errorMessage, setErrorMessage,
        projectKnowledgePool, setProjectKnowledgePool,
        wpConfigurations, setWpConfigurations,
        wpBudgetConfigs, setWpBudgetConfigs,
        generatingWPNumber, setGeneratingWPNumber,
        expandedNoteId, setExpandedNoteId,
        editingNoteId, setEditingNoteId,
        expandedStep, setExpandedStep,
        showCrmPartners, setShowCrmPartners,
        projectSaved, setProjectSaved,
        editingStep, setEditingStep,
        editInstruction, setEditInstruction,
        isImproving, setIsImproving,
        editingQuestionId, setEditingQuestionId,
        questionEditMode, setQuestionEditMode,
        questionEditText, setQuestionEditText,
        questionImproveInstruction, setQuestionImproveInstruction,
        generatingQuestionId, setGeneratingQuestionId,
        showImproveInput, setShowImproveInput,
        showDocumentPicker, setShowDocumentPicker,
        questionDocuments, setQuestionDocuments,
        expandedSections, setExpandedSections,
        previewContent, setPreviewContent,
        questionFeedback, setQuestionFeedback,
        isAnalyzingQuestion, setIsAnalyzingQuestion,
        previousAnswers, setPreviousAnswers,
        recentlyChangedQuestions, setRecentlyChangedQuestions,
        showPreviousVersion, setShowPreviousVersion,
        handleSafetyReset,
        saveGeneratorStateToProject,
        allPartners,
        analyzeConsortiumRoles,
        showGuideChat, setShowGuideChat,
        guideQuery, setGuideQuery,
        guideMessages, setGuideMessages,
        isGuideThinking, setIsGuideThinking,
        handleAskGuide
    };
}
