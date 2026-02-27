'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  Edit3,
  FileText,
  Globe,
  Layers,
  Lightbulb,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  RotateCcw,
  Save,
  Search,
  Send,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
  Users,
  Trash2,
  TrendingUp,
  Upload,
  Wand2,
  X,
  XCircle,
  Zap,
  StickyNote,
  Pencil,
  Maximize2,
  Minimize2,
  BookmarkPlus,
  Square,
  Timer,
} from 'lucide-react';
import {
  PipelineState,
  ConsortiumPartner,
  ProjectIdea,
  EvaluatorFeedback,
  PIPELINE_STEPS,
  getPipelineSteps,
  createInitialPipelineState,
  executeStep,
  generateSingleAnswer,
  generateSingleWorkPackage,
  generateSingleActivity,
  AnswerData,
  WPGenerationConfig,
} from '@/lib/project-pipeline';
import { getOfficialPipelineStructure } from '@/lib/official-pipeline-structure';
import { uploadDocument, vectorStore, type UploadedDocument } from '@/lib/rag-system';
import { generateGuideAnswer } from '@/lib/ai-service';
import StudyManager, { type UploadedStudy } from '@/components/knowledge/StudyManager';
import ProjectKnowledgePool from '@/components/knowledge/ProjectKnowledgePool';
import { KnowledgeBox } from '@/components/knowledge/KnowledgeBox';
import { useLanguageStore } from '@/store/language-store';
import { useAppStore } from '@/store/app-store';
import { formatMarkdownToReact } from '@/lib/markdown-formatter';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Partner, ProjectKnowledgePool as KnowledgePoolType } from '@/store/types';
import { LANGUAGE_NAMES, LANGUAGE_FLAGS, useTranslation, type Language } from '@/lib/i18n';
import {
  analyzePartnerForRole,
  analyzeConsortium,
  convertToConsortiumPartner,
  generatePartnerContextForAI,
  CONSORTIUM_ROLES,
  type PartnerRoleAssignment,
  type ConsortiumAnalysis as ConsortiumAnalysisType,
} from '@/lib/consortium-integration';
import { useProjectPipeline } from '@/hooks/useProjectPipeline';
import { WP_TEMPLATES, getRecommendedWPStructure, validateWPAssignment, type WPTemplate } from '@/lib/wp-templates';
import { WorkPackageConfigurator, type WPConfiguration } from '@/components/pipeline/WorkPackageConfigurator';
import { WPBudgetConfigurator, type WPBudgetConfig } from '@/components/pipeline/WPBudgetConfigurator';
import { ProposalEvaluator } from '@/components/pipeline/ProposalEvaluator';
import { PartnerSkillsMatrix } from '@/components/pipeline/PartnerSkillsMatrix';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ProjectPipelineProps {
  initialProjectId?: string;
}

export function ProjectPipeline({ initialProjectId }: ProjectPipelineProps) {
  const {
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
  } = useProjectPipeline(initialProjectId);

  const autoRunCancelledRef = useRef(false);
  const autoRunStartTimeRef = useRef<number>(0);

  const addSnippet = useAppStore(state => state.addSnippet);
  const [savedSnippetsStatus, setSavedSnippetsStatus] = useState<Record<string, boolean>>({});

  const handleSaveSnippet = (questionId: string, title: string, content: string) => {
    addSnippet({
      title: title,
      content: content,
      tags: ['generator'],
    });
    setSavedSnippetsStatus(prev => ({ ...prev, [questionId]: true }));
    setTimeout(() => {
      setSavedSnippetsStatus(prev => ({ ...prev, [questionId]: false }));
    }, 2000);
  };

  const [generatingActivityId, setGeneratingActivityId] = useState<string | null>(null);

  const handleRegenerateActivity = async (wpIndex: number, actNum: number) => {
    if (!pipelineState) return;

    const activityId = `wp${wpIndex}-act${actNum}`;
    setGeneratingActivityId(activityId);

    try {
      const { newAnswers, wp } = await generateSingleActivity(
        { ...pipelineState, knowledgePool: projectKnowledgePool },
        wpIndex,
        actNum,
        language
      );

      setPipelineState(prev => {
        if (!prev) return prev;

        const existingWPs = prev.workPackages || [];
        const wpListIndex = existingWPs.findIndex(w => w.number === wpIndex);

        let newWorkPackages: typeof existingWPs = [];
        if (wpListIndex >= 0) {
          newWorkPackages = [...existingWPs];
          newWorkPackages[wpListIndex] = wp;
        } else {
          newWorkPackages = [...existingWPs, wp].sort((a, b: any) => a.number - b.number);
        }

        const newState = {
          ...prev,
          workPackages: newWorkPackages,
          answers: {
            ...prev.answers,
            ...newAnswers
          }
        };

        if (currentProjectId) {
          saveGeneratorStateToProject(newState);
        }

        return newState;
      });

    } catch (e) {
      console.error('Failed to regenerate activity', e);
      setCurrentStatus('Fehler beim Generieren der Aktivität: ' + (e as Error).message);
    } finally {
      setGeneratingActivityId(null);
    }
  };

  // Sync knowledge pool to pipeline state whenever it changes
  // This ensures generateSingleAnswer has access to the latest knowledge pool
  useEffect(() => {
    if (pipelineState && projectKnowledgePool) {
      // Only update if there's a meaningful difference
      const currentDocs = pipelineState.knowledgePool?.documents?.length || 0;
      const newDocs = projectKnowledgePool.documents?.length || 0;
      const currentSites = pipelineState.knowledgePool?.websites?.length || 0;
      const newSites = projectKnowledgePool.websites?.length || 0;
      const currentNotes = pipelineState.knowledgePool?.notes?.length || 0;
      const newNotes = projectKnowledgePool.notes?.length || 0;

      if (currentDocs !== newDocs || currentSites !== newSites || currentNotes !== newNotes) {
        console.log(`[Generator] Syncing knowledge pool to pipeline state: ${newDocs} docs, ${newSites} sites, ${newNotes} notes`);
        setPipelineState(prev => prev ? { ...prev, knowledgePool: projectKnowledgePool } : prev);
      }
    }
  }, [projectKnowledgePool, pipelineState?.knowledgePool?.documents?.length, pipelineState?.knowledgePool?.websites?.length, pipelineState?.knowledgePool?.notes?.length]);

  useEffect(() => {
    setMounted(true);
    setUploadedDocs(vectorStore.getDocuments());

    // Load knowledge base for pipeline generation
    import('@/lib/knowledge-loader').then(({ loadKnowledgeBase }) => {
      loadKnowledgeBase(actionType, (status, progress) => {
        console.log(`[KnowledgeLoader] ${status} (${progress}%)`);
      });
    });

    // Check URL for project parameter or use initialProjectId prop
    const urlParams = new URLSearchParams(window.location.search);
    const projectIdFromUrl = urlParams.get('project') || urlParams.get('projectId') || initialProjectId;
    const isFromConcept = urlParams.get('fromConcept') === 'true';

    if (projectIdFromUrl) {
      setFromConcept(isFromConcept);
      setPendingProjectId(projectIdFromUrl);
    }
  }, [initialProjectId]);

  // Load project once store is rehydrated (projects available from IndexedDB)
  useEffect(() => {
    if (!pendingProjectId || currentProjectId) return;
    const project = projects.find(p => p.id === pendingProjectId);
    if (project) {
      loadProjectIntoGenerator(pendingProjectId, fromConcept);
      setPendingProjectId(null);
    }
  }, [projects, pendingProjectId, currentProjectId, fromConcept]);

  // Prevent accidental browser close during auto-run
  useEffect(() => {
    if (isAutoRunning) {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [isAutoRunning]);

  // Load existing project into generator
  const loadProjectIntoGenerator = (projectId: string, fromConcept: boolean = false) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      console.warn(`Project ${projectId} not found`);
      return;
    }

    console.log(`[Generator] Loading project: ${project.title} (fromConcept: ${fromConcept})`);
    setCurrentProjectId(projectId);

    // Load project knowledge pool if exists
    if (project.knowledgePool) {
      setProjectKnowledgePool(project.knowledgePool);
      console.log(`[Generator] Restored knowledge pool: ${project.knowledgePool.documents?.length || 0} docs, ${project.knowledgePool.websites?.length || 0} sites`);
    }

    // When coming from Concept Developer export, ALWAYS rebuild from fresh project data.
    // This ensures the latest concept changes (budget, duration, partners, etc.) take effect.
    // Only restore saved generatorState when navigating back to an in-progress generator project.
    if (project.generatorState && !fromConcept) {
      // Ensure knowledge pool is included in the restored state
      setPipelineState({
        ...project.generatorState,
        knowledgePool: project.knowledgePool || project.generatorState.knowledgePool,
      });
      setSetupPhase('ready');
      setProjectSaved(true);
      console.log(`[Generator] Restored generator state from project (with knowledgePool: ${project.knowledgePool?.documents?.length || 0} docs)`);
    } else {
      // Create initial PipelineState from project data
      // Build consortium from project
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

      // Build idea from project
      const projectIdea: ProjectIdea = {
        shortDescription: project.problemStatement || project.title,
        // Use the real problem statement/objective so AI has genuine project context
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
      if (fromConcept) {
        console.log(`[Generator] Re-initialized from concept export with ${projectConsortium.length} partners, budget ${project.budgetTier}, duration ${project.duration}m`);
      } else {
        console.log(`[Generator] Created initial state from project data`);
      }
    }
  };

  // Handler to manually set coordinator
  const handleSetCoordinator = (partnerId: string) => {
    setCoordinatorId(partnerId);

    // Update role assignments
    setPartnerRoleAssignments(prev => {
      const updated = { ...prev };
      // Remove COORDINATOR from previous
      for (const id of Object.keys(updated)) {
        if (updated[id].suggestedRole === 'COORDINATOR' && id !== partnerId) {
          updated[id] = { ...updated[id], suggestedRole: 'PARTNER' };
        }
      }
      // Set new coordinator
      if (updated[partnerId]) {
        updated[partnerId] = { ...updated[partnerId], suggestedRole: 'COORDINATOR' };
      }
      return updated;
    });
  };

  // Handler to change partner role
  const handleChangePartnerRole = (partnerId: string, newRole: PartnerRoleAssignment['suggestedRole']) => {
    if (newRole === 'COORDINATOR') {
      handleSetCoordinator(partnerId);
    } else {
      setPartnerRoleAssignments(prev => ({
        ...prev,
        [partnerId]: { ...prev[partnerId], suggestedRole: newRole }
      }));
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddPartnerFromUrl = async () => {
    if (!newPartnerUrl.trim()) return;

    setIsLoadingPartner(true);
    try {
      const response = await fetch('/api/extract-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newPartnerUrl, language }),
      });

      const data = await response.json();
      if (data.partner) {
        const newPartner: ConsortiumPartner = {
          id: crypto.randomUUID(),
          name: data.partner.organizationName,
          country: data.partner.country,
          type: data.partner.organizationType,
          expertise: data.partner.expertiseAreas?.map((e: { domain: string }) => e.domain) || [],
          targetGroups: data.partner.targetGroups?.map((t: { group: string }) => t.group) || [],
          isLead: allPartners.length === 0,
        };
        setManualPartners([...manualPartners, newPartner]);
        setNewPartnerUrl('');
      }
    } catch (error) {
      console.error('Partner import error:', error);
    }
    setIsLoadingPartner(false);
  };

  // AI: Suggest partners based on project idea using Gemini
  const handleSuggestPartners = async () => {
    if (crmPartners.length === 0 || !ideaDescription) return;

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch('/api/suggest-partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partners: crmPartners,
          projectIdea: {
            description: ideaDescription,
            mainObjective,
            targetGroups,
            sector,
            actionType,
          },
          language,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Set suggested partner IDs
        setSuggestedPartners(result.suggestedPartnerIds || []);

        // Store details for each suggestion
        const details: Record<string, { reason: string; suggestedRole: string; matchScore: number }> = {};
        result.suggestions?.forEach((s: { partnerId: string; reason: string; suggestedRole: string; matchScore: number }) => {
          details[s.partnerId] = {
            reason: s.reason,
            suggestedRole: s.suggestedRole,
            matchScore: s.matchScore,
          };
        });
        setPartnerSuggestionDetails(details);

        // Store consortium analysis
        if (result.consortiumAnalysis) {
          setConsortiumAnalysis(result.consortiumAnalysis);
        }
      } else {
        // Fallback to simple matching if API fails
        const suggested: string[] = [];
        const ideaLower = ideaDescription.toLowerCase();

        crmPartners.forEach(p => {
          const hasMatchingExpertise = p.expertiseAreas?.some(e =>
            ideaLower.includes(e.domain.toLowerCase()) ||
            e.description?.toLowerCase().includes(ideaLower.split(' ')[0])
          );
          const hasMatchingTargetGroup = p.targetGroups?.some(t =>
            targetGroups.some(tg => t.group.toLowerCase().includes(tg))
          );

          if (hasMatchingExpertise || hasMatchingTargetGroup) {
            suggested.push(p.id);
          }
        });

        if (suggested.length === 0 && crmPartners.length >= 3) {
          suggested.push(...crmPartners.slice(0, 3).map(p => p.id));
        }

        setSuggestedPartners(suggested);
      }
    } catch (error) {
      console.error('Suggestion error:', error);
    }
    setIsLoadingSuggestions(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const docType = file.name.toLowerCase().includes('guide') || file.name.toLowerCase().includes('leitfaden')
        ? 'programme_guide' as const
        : 'study' as const;

      const doc = await uploadDocument(file, docType, (progress, status) => {
        setUploadProgress(progress);
        setUploadStatus(status);
      });

      setUploadedDocs([...uploadedDocs, doc]);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Fehler beim Upload');
    }
    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleStartPipeline = () => {
    const idea: ProjectIdea = {
      shortDescription: ideaDescription,
      mainObjective,
      targetGroups,
      sector,
      actionType,
    };

    const initialState = createInitialPipelineState(allPartners, idea, {
      totalBudget,
      wpCount,
      actionType,
    }, undefined); // No concept yet if starting fresh

    // Include WP configurations if available
    if (wpConfigurations.length > 0) {
      initialState.wpConfigurations = wpConfigurations;
    }

    // Include project knowledge pool
    initialState.knowledgePool = projectKnowledgePool;
    console.log(`[Generator] Starting pipeline with knowledge pool: ${projectKnowledgePool.documents?.length || 0} docs, ${projectKnowledgePool.websites?.length || 0} sites`);

    setPipelineState(initialState);
    setSetupPhase('ready');
  };

  /**
   * Generate a single Work Package based on configuration
   */
  const handleGenerateWP = async (wpNumber: number, config: WPConfiguration) => {
    if (!pipelineState) return;

    setGeneratingWPNumber(wpNumber);
    setCurrentStatus(language === 'de'
      ? `Generiere WP${wpNumber}: ${config.titleDE || config.title}...`
      : `Generating WP${wpNumber}: ${config.title}...`);

    try {
      // Convert WPConfiguration to WPGenerationConfig
      const wpGenConfig: WPGenerationConfig = {
        wpNumber: config.wpNumber,
        type: config.type,
        title: config.title,
        titleDE: config.titleDE,
        leadPartnerId: config.leadPartnerId,
        selectedActivities: config.selectedActivities,
        selectedDeliverables: config.selectedDeliverables,
        budgetPercent: config.budgetPercent,
        duration: config.duration,
        objectives: config.objectives
      };

      // Ensure we have the latest knowledge pool
      const stateWithKnowledge = {
        ...pipelineState,
        knowledgePool: projectKnowledgePool
      };

      // 5 min timeout per single WP generation
      const wpTimeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(
          language === 'de'
            ? `Zeitüberschreitung bei WP${wpNumber}. Bitte erneut versuchen.`
            : `Timeout generating WP${wpNumber}. Please try again.`
        )), 300000)
      );

      const { workPackage, answers } = await Promise.race([
        generateSingleWorkPackage(stateWithKnowledge, wpGenConfig, language),
        wpTimeoutPromise
      ]);

      // Update pipeline state with new WP
      setPipelineState(prev => {
        if (!prev) return prev;

        // Find or create work packages array
        const existingWPs = prev.workPackages || [];
        const wpIndex = existingWPs.findIndex(wp => wp.number === wpNumber);

        let newWPs: typeof existingWPs;
        if (wpIndex >= 0) {
          // Replace existing WP
          newWPs = [...existingWPs];
          newWPs[wpIndex] = workPackage;
        } else {
          // Add new WP
          newWPs = [...existingWPs, workPackage].sort((a, b) => a.number - b.number);
        }

        return {
          ...prev,
          workPackages: newWPs,
          answers: { ...prev.answers, ...answers }
        };
      });

      setCurrentStatus(language === 'de'
        ? `WP${wpNumber} erfolgreich generiert!`
        : `WP${wpNumber} generated successfully!`);

    } catch (error: any) {
      console.error(`[handleGenerateWP] Error:`, error);
      setCurrentStatus(language === 'de'
        ? `Fehler bei WP${wpNumber}: ${error.message}`
        : `Error with WP${wpNumber}: ${error.message}`);
    } finally {
      setGeneratingWPNumber(null);
    }
  };

  /**
   * Execute a single step OR sub-step (for Step 2 partners)
   * @param stepNumber - Main step number (1-7)
   * @param subStepIndex - Optional: Partner index for Step 2 sub-steps (0-based)
   */
  const handleExecuteStep = async (stepNumber: number, subStepIndex?: number): Promise<boolean> => {
    if (!pipelineState) return false;

    // Safety check: if already generating, don't start another one
    if (isGenerating) {
      console.warn('Already generating, ignoring request');
      return false;
    }

    setIsGenerating(true);
    setExpandedStep(stepNumber);

    // Build status message for sub-steps
    let statusMsg = '';
    if (stepNumber === 2 && subStepIndex !== undefined) {
      const partner = pipelineState.consortium[subStepIndex];
      statusMsg = language === 'de'
        ? `Generiere Partner ${subStepIndex + 1}/${pipelineState.consortium.length}: ${partner?.name || 'Partner'}...`
        : `Generating Partner ${subStepIndex + 1}/${pipelineState.consortium.length}: ${partner?.name || 'Partner'}...`;
    }
    if (statusMsg) setCurrentStatus(statusMsg);

    // Safety timeout - 20 minutes for complex steps (Step 6 WPs have 18 questions each, 240s per question)
    const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
      setTimeout(() => resolve({ timeout: true }), 1200000); // 1200s timeout (20 min)
    });

    try {
      const executionPromise = executeStep(
        pipelineState,
        stepNumber,
        language,
        setCurrentStatus,
        subStepIndex // Pass sub-step index for Step 2
      );

      const result = await Promise.race([executionPromise, timeoutPromise]);

      if ('timeout' in result) {
        throw new Error(language === 'de'
          ? 'Zeitüberschreitung: Die Generierung hat zu lange gedauert. Bitte versuchen Sie es erneut oder prüfen Sie Ihre Internetverbindung.'
          : 'Timeout: Generation took too long. Please try again or check your internet connection.');
      }

      const { newState } = result;

      setPipelineState(newState);
      setCurrentStatus('');

      // AUTO-SAVE: Save progress after each successful step
      // Pass the newState directly to avoid stale closure issues
      if (currentProjectId) {
        saveGeneratorStateToProject(newState);
        console.log(`[Generator] Auto-saved after step ${stepNumber}`);
      }

      return true;
    } catch (error) {
      console.error('Step execution error:', error);
      const errorMsg = (error as Error).message;
      // Provide more helpful error messages
      if (errorMsg.includes('timeout') || errorMsg.includes('Zeitüberschreitung')) {
        setCurrentStatus(errorMsg);
      } else if (errorMsg.includes('API') || errorMsg.includes('fetch')) {
        setCurrentStatus(language === 'de'
          ? 'API-Fehler: Verbindungsproblem. Bitte erneut versuchen.'
          : 'API Error: Connection problem. Please try again.');
      } else {
        setCurrentStatus((language === 'de' ? 'Fehler: ' : 'Error: ') + errorMsg);
      }
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Execute Step 2 (Organisations) for ALL partners sequentially
   * Uses sub-steps to prevent timeout issues
   */
  const handleExecuteStep2AllPartners = async (): Promise<boolean> => {
    if (!pipelineState) return false;

    const partnerCount = pipelineState.consortium.length;
    let currentState = pipelineState;

    for (let i = 0; i < partnerCount; i++) {
      const partner = currentState.consortium[i];
      setCurrentStatus(language === 'de'
        ? `Generiere Partner ${i + 1}/${partnerCount}: ${partner.name}...`
        : `Generating Partner ${i + 1}/${partnerCount}: ${partner.name}...`);

      const success = await handleExecuteStep(2, i);
      if (!success) {
        setCurrentStatus(language === 'de'
          ? `Fehler bei Partner ${i + 1}. Bitte einzeln erneut versuchen.`
          : `Error at Partner ${i + 1}. Please retry individually.`);
        return false;
      }

      // Update local state reference after each partner
      if (pipelineState) {
        currentState = pipelineState;
      }

      // Short pause between partners
      if (i < partnerCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    setCurrentStatus('');
    return true;
  };

  // Full auto-run: Execute ALL steps automatically (1 through final step)
  // Includes sub-steps for partners (Step 2) and WPs (Step 6 / KA210 Step 4)
  const handleExecuteAll = async () => {
    if (!pipelineState) return;

    const dynamicSteps = getPipelineSteps(wpCount);
    let currentLocalState = { ...pipelineState };
    const currentActionType = currentLocalState.configuration?.actionType || actionType || 'KA220';

    // Update totalSteps in state if it mismatches
    if (currentLocalState.totalSteps !== dynamicSteps.length) {
      currentLocalState.totalSteps = dynamicSteps.length;
    }

    // Full auto-run: go through ALL steps
    const startStep = currentLocalState.currentStep + 1;
    const endStep = dynamicSteps.length;

    if (startStep > endStep) {
      setCurrentStatus(language === 'de'
        ? '✅ Antrag bereits vollständig generiert!'
        : '✅ Application already fully generated!');
      return;
    }

    // Initialize auto-run state
    autoRunCancelledRef.current = false;
    autoRunStartTimeRef.current = Date.now();
    setIsAutoRunning(true);

    for (let step = startStep; step <= endStep; step++) {
      // Check cancellation
      if (autoRunCancelledRef.current) {
        setCurrentStatus(language === 'de'
          ? `⏹ Auto-Generierung bei Schritt ${step} gestoppt. Fortschritt gespeichert.`
          : `⏹ Auto-generation stopped at step ${step}. Progress saved.`);
        saveGeneratorStateToProject(currentLocalState);
        break;
      }

      setIsGenerating(true);
      setExpandedStep(step);

      let retryCount = 0;
      let stepSuccess = false;

      while (!stepSuccess && retryCount <= 1) {
        try {
          // Small delay before starting to ensure UI is ready
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Determine if this is a WP step with sub-steps
          const isWPStep = (currentActionType === 'KA220' && step === 6) || (currentActionType === 'KA210' && step === 4);

          if (step === 2) {
            // SPECIAL HANDLING: Step 2 uses sub-steps per partner
            const partnerCount = currentLocalState.consortium.length;
            setCurrentStatus(language === 'de'
              ? `Generiere Schritt 2: Organisationen (${partnerCount} Partner)...`
              : `Generating step 2: Organisations (${partnerCount} partners)...`);

            for (let partnerIdx = 0; partnerIdx < partnerCount; partnerIdx++) {
              if (autoRunCancelledRef.current) break;

              const partner = currentLocalState.consortium[partnerIdx];
              setCurrentStatus(language === 'de'
                ? `Schritt 2: Partner ${partnerIdx + 1}/${partnerCount} — ${partner.name}...`
                : `Step 2: Partner ${partnerIdx + 1}/${partnerCount} — ${partner.name}...`);

              const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Partner timeout')), 180000);
              });

              const { newState } = await Promise.race([
                executeStep(currentLocalState, 2, language, setCurrentStatus, partnerIdx),
                timeoutPromise
              ]);

              currentLocalState = newState;
              setPipelineState(newState);

              if (partnerIdx < partnerCount - 1) {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          } else if (isWPStep) {
            // SPECIAL HANDLING: WP step uses sub-steps per work package
            const wpTotal = currentLocalState.configuration?.wpCount || 5;
            setCurrentStatus(language === 'de'
              ? `Generiere Schritt ${step}: Arbeitspakete (${wpTotal} WPs)...`
              : `Generating step ${step}: Work Packages (${wpTotal} WPs)...`);

            for (let wpIdx = 0; wpIdx < wpTotal; wpIdx++) {
              if (autoRunCancelledRef.current) break;

              setCurrentStatus(language === 'de'
                ? `Schritt ${step}: WP ${wpIdx + 1} von ${wpTotal}...`
                : `Step ${step}: WP ${wpIdx + 1} of ${wpTotal}...`);

              const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('WP timeout')), 1200000); // 20 min per WP
              });

              const { newState } = await Promise.race([
                executeStep(currentLocalState, step, language, setCurrentStatus, wpIdx),
                timeoutPromise
              ]);

              currentLocalState = newState;
              setPipelineState(newState);

              // Auto-save after each WP
              saveGeneratorStateToProject(newState);

              if (wpIdx < wpTotal - 1) {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          } else {
            // Normal step execution
            setCurrentStatus(language === 'de'
              ? `Generiere Schritt ${step} von ${endStep}...`
              : `Generating step ${step} of ${endStep}...`);

            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Step timeout')), 1200000);
            });

            const { newState } = await Promise.race([
              executeStep(currentLocalState, step, language, setCurrentStatus),
              timeoutPromise
            ]);

            currentLocalState = newState;
            setPipelineState(newState);
          }

          // Auto-save after each step
          saveGeneratorStateToProject(currentLocalState);
          stepSuccess = true;

          // Update UI state
          setIsGenerating(false);
          setCurrentStatus(language === 'de'
            ? `✅ Schritt ${step}/${endStep} fertig. ${step < endStep ? 'Weiter...' : ''}`
            : `✅ Step ${step}/${endStep} done. ${step < endStep ? 'Continuing...' : ''}`);

          // Robust delay between steps
          if (step < endStep) {
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        } catch (error) {
          console.warn(`Pipeline error at step ${step} (retry ${retryCount})`, error);
          const errorMsg = (error as Error).message;

          if (retryCount < 1) {
            retryCount++;
            setCurrentStatus(language === 'de'
              ? `⚠️ Fehler bei Schritt ${step}. Wiederholungsversuch in 15 Sekunden...`
              : `⚠️ Error at step ${step}. Retrying in 15 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 15000));
            continue; // Retry the step
          }

          // After retry failed: save progress and stop
          saveGeneratorStateToProject(currentLocalState);

          if (errorMsg.includes('timeout')) {
            setCurrentStatus(language === 'de'
              ? `❌ Zeitüberschreitung bei Schritt ${step}. Fortschritt gespeichert — bitte manuell fortsetzen.`
              : `❌ Timeout at step ${step}. Progress saved — please continue manually.`);
          } else {
            setCurrentStatus(language === 'de'
              ? `❌ Fehler bei Schritt ${step}: ${errorMsg}. Fortschritt gespeichert.`
              : `❌ Error at step ${step}: ${errorMsg}. Progress saved.`);
          }
          setIsGenerating(false);
          setIsAutoRunning(false);
          return; // Exit function
        }
      }
    }

    // All steps completed or cancelled
    setIsGenerating(false);
    setIsAutoRunning(false);

    if (!autoRunCancelledRef.current && currentLocalState.currentStep >= endStep) {
      const elapsed = Math.round((Date.now() - autoRunStartTimeRef.current) / 60000);
      setCurrentStatus(language === 'de'
        ? `🎉 Antrag vollständig generiert! (${elapsed} Min.)`
        : `🎉 Application fully generated! (${elapsed} min.)`);
    }
  };

  // Save project to store
  // Handle improving a section with AI
  const handleImproveSection = async (
    stepNumber: number,
    evaluatorFeedback?: EvaluatorFeedback,
    customInstruction?: string
  ) => {
    if (!pipelineState) return;

    setIsImproving(true);
    setEditingStep(stepNumber);

    try {
      // Get the content to improve based on step
      let sectionType = '';
      let currentContent: unknown = null;

      const wpCount = pipelineState.configuration?.wpCount || 5;
      const wpStart = 4;
      const wpEnd = wpStart + wpCount - 1;

      if (stepNumber === 1) {
        sectionType = 'Projekttitel und Akronym';
        currentContent = {
          projectTitle: pipelineState.projectTitle,
          acronym: pipelineState.acronym,
        };
      } else if (stepNumber === 2) {
        sectionType = 'Bedarfsanalyse';
        currentContent = pipelineState.needsAnalysis;
      } else if (stepNumber === 3) {
        sectionType = 'Projektziele';
        currentContent = pipelineState.objectives;
      } else if (stepNumber >= wpStart && stepNumber <= wpEnd) {
        sectionType = `Work Package ${stepNumber - 3}`;
        currentContent = pipelineState.workPackages?.[stepNumber - 4];
      } else if (stepNumber === wpEnd + 1) {
        sectionType = 'Methodologie';
        currentContent = pipelineState.methodology;
      } else if (stepNumber === wpEnd + 2) {
        sectionType = 'Impact und Nachhaltigkeit';
        currentContent = {
          impact: pipelineState.impact,
          sustainability: pipelineState.sustainability,
        };
      } else if (stepNumber === wpEnd + 3) {
        sectionType = 'Budget und Timeline';
        currentContent = {
          budget: pipelineState.budget,
          timeline: pipelineState.timeline,
        };
      } else if (stepNumber === wpEnd + 4) {
        sectionType = 'Executive Summary';
        currentContent = {
          executiveSummary: pipelineState.executiveSummary,
        };
      }

      // Get API key from localStorage
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini-api-key') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['x-gemini-api-key'] = apiKey;
      }

      const response = await fetch('/api/improve-section', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sectionType,
          currentContent,
          instruction: customInstruction || editInstruction,
          evaluatorFeedback: evaluatorFeedback ? {
            weaknesses: evaluatorFeedback.weaknesses,
            suggestions: evaluatorFeedback.suggestions,
            criticalIssues: evaluatorFeedback.criticalIssues,
          } : undefined,
          projectContext: {
            projectTitle: pipelineState.projectTitle,
            acronym: pipelineState.acronym,
            sector: pipelineState.idea.sector,
            targetGroups: pipelineState.idea.targetGroups,
            objectives: pipelineState.objectives?.generalObjective,
          },
          language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || 'Verbesserung fehlgeschlagen';
        console.error('API Error:', errorMsg);
        setCurrentStatus(`Fehler: ${errorMsg}`);
        setIsImproving(false);
        return;
      }

      // Update the pipeline state with improved content
      const newState = { ...pipelineState };

      if (stepNumber === 1) {
        newState.projectTitle = data.improvedContent.projectTitle;
        newState.acronym = data.improvedContent.acronym;
      } else if (stepNumber === 2) {
        newState.needsAnalysis = data.improvedContent;
      } else if (stepNumber === 3) {
        newState.objectives = data.improvedContent;
      } else if (stepNumber >= wpStart && stepNumber <= wpEnd) {
        if (newState.workPackages) {
          newState.workPackages[stepNumber - 4] = data.improvedContent;
        }
      } else if (stepNumber === wpEnd + 1) {
        newState.methodology = data.improvedContent;
      } else if (stepNumber === wpEnd + 2) {
        newState.impact = data.improvedContent.impact;
        newState.sustainability = data.improvedContent.sustainability;
      } else if (stepNumber === wpEnd + 3) {
        newState.budget = data.improvedContent.budget;
        newState.timeline = data.improvedContent.timeline;
      } else if (stepNumber === wpEnd + 4) {
        newState.executiveSummary = data.improvedContent.executiveSummary;
      }

      setEditInstruction('');
      setEditingStep(null);

      // Store in preview instead of applying directly
      setPreviewContent(prev => ({ ...prev, [stepNumber]: data.improvedContent }));

      // setPipelineState(newState); -- OLD DIRECT APPLY
      setIsImproving(false);

      setIsImproving(false);

    } catch (error) {
      console.error('Improve section error:', error);
      setCurrentStatus('Fehler beim Verbessern: ' + (error as Error).message);
      setIsImproving(false);
    }
  };

  // Analyze specific answer
  const analyzeAnswer = async (questionId: string, questionText: string, answerText: string) => {
    if (!answerText || !answerText.trim()) return;

    setIsAnalyzingQuestion(questionId);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout
    try {
      const response = await fetch('/api/evaluate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          answer: answerText,
          projectContext: {
            projectTitle: pipelineState?.projectTitle,
            sector: pipelineState?.idea.sector,
          },
          language
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const feedback = await response.json();
        setQuestionFeedback(prev => ({ ...prev, [questionId]: feedback }));
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        console.warn('[analyzeAnswer] Timeout (45s) for question:', questionId);
      } else {
        console.error('Analysis failed', e);
      }
    } finally {
      setIsAnalyzingQuestion(null); // ALWAYS reset, even on timeout/error
    }
  };

  const handleSaveProject = () => {
    if (!pipelineState || !pipelineState.projectTitle) return;

    const projectDuration = actionType === 'KA220' ? 24 : 12;

    // Convert pipeline objectives to store format
    const objectives = pipelineState.objectives ? [
      // General objective
      {
        id: crypto.randomUUID(),
        code: 'GO',
        type: 'GENERAL' as const,
        description: pipelineState.objectives.generalObjective,
        indicators: [],
      },
      // Specific objectives
      ...pipelineState.objectives.specificObjectives.map((so, idx) => ({
        id: crypto.randomUUID(),
        code: so.id || `SO${idx + 1}`,
        type: 'SPECIFIC' as const,
        description: so.description,
        indicators: so.indicators || [],
      })),
    ] : [];

    // Convert partners to consortium format
    const consortium = allPartners.map((p, idx) => ({
      id: crypto.randomUUID(),
      partnerId: p.id,
      role: (idx === 0 ? 'COORDINATOR' : 'PARTNER') as 'COORDINATOR' | 'PARTNER',
      budgetShare: Math.round(100 / allPartners.length),
      justification: p.expertise?.join(', ') || '',
      workPackageLeadership: [] as string[],
    }));

    // Convert work packages to store format
    const workPackages = pipelineState.workPackages?.map((wp) => {
      const wpId = crypto.randomUUID();
      // Handle duration as either string or object
      const wpDuration = typeof wp.duration === 'object' && wp.duration
        ? { start: wp.duration.start, end: wp.duration.end }
        : { start: 1, end: 12 };

      return {
        id: wpId,
        number: wp.number,
        title: wp.title,
        objectives: wp.objectives,
        description: wp.objectives.join('. '),
        startMonth: wpDuration.start,
        endMonth: wpDuration.end,
        leadPartner: allPartners.find(p => p.name === wp.lead)?.id || allPartners[0]?.id || '',
        activities: wp.activities.map((a, aIdx) => {
          // Handle month as either string or object
          const actMonth = typeof a.month === 'object' && a.month
            ? { start: a.month.start, end: a.month.end }
            : { start: 1, end: 1 };

          return {
            id: crypto.randomUUID(),
            code: `A${wp.number}.${aIdx + 1}`,
            title: a.title,
            description: a.description,
            startMonth: actMonth.start,
            endMonth: actMonth.end,
            leadPartner: allPartners[0]?.id || '',
          };
        }),
        deliverables: wp.deliverables.map(d => ({
          id: crypto.randomUUID(),
          code: d.id,
          title: d.title,
          type: (d.type?.toString().toUpperCase() === 'REPORT' ? 'REPORT' : d.type?.toString().toUpperCase() === 'TOOL' ? 'TOOL' : 'OTHER') as 'REPORT' | 'TOOL' | 'CURRICULUM' | 'GUIDE' | 'OTHER',
          disseminationLevel: 'PUBLIC' as const,
          dueMonth: d.dueMonth,
          description: d.title,
        })),
      };
    }) || [];


    addProject({
      title: pipelineState.projectTitle,
      acronym: pipelineState.acronym || '',
      actionType: pipelineState.idea.actionType,
      sector: pipelineState.idea.sector,
      status: 'DRAFT',
      budgetTier: actionType === 'KA220' ? 250000 : 60000,
      duration: projectDuration,
      callYear: 2026,
      horizontalPriorities: [],
      problemStatement: pipelineState.needsAnalysis?.problemStatement || '',
      rootCauses: pipelineState.needsAnalysis?.gaps || [],
      statistics: pipelineState.needsAnalysis?.statistics?.map(s => ({
        id: crypto.randomUUID(),
        statement: s.fact,
        source: s.source,
        year: 2024,
      })) || [],
      targetGroups: pipelineState.idea.targetGroups.map(tg => {
        const needsInfo = pipelineState.needsAnalysis?.targetGroupNeeds?.find(n => n.group === tg);
        return {
          id: crypto.randomUUID(),
          name: tg,
          size: 100,
          characteristics: '',
          needs: needsInfo ? needsInfo.needs : [],
        };
      }),
      objectives,
      consortium,
      workPackages,
      results: [],
      indicators: pipelineState.impact?.quantitativeIndicators?.map(ind => ({
        id: crypto.randomUUID(),
        name: ind.indicator,
        type: 'OUTPUT', // Default type
        target: parseInt(ind.target) || 0,
        unit: 'participants', // Default unit, could vary
        measurementMethod: ind.measurement,
      })) || [],
      disseminationChannels: pipelineState.dissemination?.channels?.map(c => c.channel) || [],
      multiplierEvents: pipelineState.dissemination?.multiplierEvents?.map((me, idx) => ({
        id: crypto.randomUUID(),
        name: me.title,
        type: 'Conference',
        month: 18 + idx * 3,
        location: me.country,
        country: me.country,
        targetParticipants: me.participants,
        hostPartnerId: allPartners[idx % allPartners.length]?.id || '',
      })) || [],
      sustainabilityPlan: [
        pipelineState.sustainability?.strategy,
        pipelineState.sustainability?.financialSustainability && `Financial: ${pipelineState.sustainability.financialSustainability}`,
        pipelineState.sustainability?.institutionalSustainability && `Institutional: ${pipelineState.sustainability.institutionalSustainability}`,
      ].filter(Boolean).join('\n\n') || '',
      impactVision: [
        pipelineState.impact?.expectedImpact,
        pipelineState.impact?.longTermEffects && `Long-term: ${pipelineState.impact.longTermEffects}`
      ].filter(Boolean).join('\n\n') || '',
    });

    setProjectSaved(true);
  };

  // ============================================================================
  // TARGET GROUPS OPTIONS
  // ============================================================================

  const targetGroupOptions = [
    { value: 'migrants', label: t('migrants') },
    { value: 'disabilities', label: t('disabilities') },
    { value: 'roma', label: 'Roma' },
    { value: 'unemployed', label: t('unemployed') },
    { value: 'youth_neet', label: 'NEET' },
    { value: 'seniors', label: t('seniors') },
    { value: 'teachers', label: t('teachers') },
    { value: 'trainers', label: 'Trainer/Coaches' },
    { value: 'low_skilled', label: t('lowSkilled') },
    { value: 'women', label: t('women') },
  ];

  const minPartners = actionType === 'KA220' ? 3 : 2;
  const hasEnoughPartners = allPartners.length >= minPartners;

  // ============================================================================
  // RENDER SETUP PHASE
  // ============================================================================

  if (setupPhase !== 'ready' || !pipelineState) {
    return (
      <div className="max-w-2xl mx-auto py-16 space-y-6">
        {/* Redirect to Concept Developer */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-full text-sm font-medium mb-6">
            <Brain className="h-4 w-4" />
            Antrags-Generator
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Bitte starte über den Konzeptentwickler
          </h1>
          <p className="text-gray-600 max-w-md mx-auto mb-8">
            Der Generator wird automatisch aus dem Konzeptentwickler befüllt — mit Projekttitel, Budget, Laufzeit, Partnern und Work Packages. Bitte entwickle zuerst dein Konzept und klicke dann auf <strong>"Zur Antrags-Entwicklung"</strong>.
          </p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#003399] text-white rounded-xl font-medium hover:bg-blue-800 transition-colors shadow-md"
          >
            <Lightbulb className="h-5 w-5" />
            Zum Konzeptentwickler
          </button>
        </div>

        {/* If a project is being loaded (pendingProjectId), show loading indicator */}
        {pendingProjectId && (
          <div className="text-center text-gray-500 text-sm mt-4 flex items-center justify-center gap-2">
            <RotateCcw className="h-4 w-4 animate-spin" />
            Projekt wird geladen...
          </div>
        )}
      </div>
    );
  }


  // ============================================================================
  // RENDER OFFICIAL QUESTIONS & ANSWERS (Interactive Editor)
  // ============================================================================


  // Helper to get answer value from potentially nested AnswerData
  const getAnswerValue = (answer: string | string[] | AnswerData | undefined): string => {
    if (!answer) return '';
    if (typeof answer === 'string') return answer;
    if (Array.isArray(answer)) return answer.join(', ');
    if (typeof answer === 'object' && 'value' in answer) return answer.value;
    return '';
  };

  // Track answer changes for visual diff highlighting
  const trackAnswerChange = (questionId: string) => {
    if (!pipelineState) return;
    const currentRaw = pipelineState.answers?.[questionId];
    const currentValue = getAnswerValue(currentRaw);
    if (currentValue) {
      setPreviousAnswers(prev => ({ ...prev, [questionId]: currentValue }));
    }
    setRecentlyChangedQuestions(prev => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });
  };

  const dismissChangeHighlight = (questionId: string) => {
    setRecentlyChangedQuestions(prev => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
    setPreviousAnswers(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setShowPreviousVersion(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  // Handle AI regeneration for single question
  const handleRegenerateQuestion = async (questionId: string, chapterId: number, instruction?: string) => {
    if (!pipelineState) return;
    trackAnswerChange(questionId);
    setGeneratingQuestionId(questionId);
    try {
      // CRITICAL: Ensure the pipeline state has the CURRENT knowledge pool!
      const stateWithCurrentKnowledge = {
        ...pipelineState,
        knowledgePool: projectKnowledgePool, // Always use the latest knowledge pool
      };
      console.log(`[handleRegenerateQuestion] Calling generateSingleAnswer with knowledgePool: ${projectKnowledgePool.documents?.length || 0} docs`);

      const snippetsToPass = useAppStore.getState().snippets?.map(s => ({ title: s.title, content: s.content })) || [];

      const result = await generateSingleAnswer(stateWithCurrentKnowledge, questionId, chapterId, language, instruction, undefined, snippetsToPass);

      // Update pipelineState with new answer
      setPipelineState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          answers: {
            ...prev.answers,
            [questionId]: result
          }
        };
      });

      // Clear instruction input
      setQuestionImproveInstruction(prev => ({ ...prev, [questionId]: '' }));
      setShowImproveInput(prev => ({ ...prev, [questionId]: false }));
    } catch (e) {
      console.error('Question regeneration failed:', e);
    }
    setGeneratingQuestionId(null);
  };

  // Handle manual save
  const handleSaveManualAnswer = (questionId: string) => {
    const newValue = questionEditText[questionId];
    if (!pipelineState || newValue === undefined) return;

    setPipelineState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        answers: {
          ...prev.answers,
          [questionId]: {
            value: newValue,
            mode: 'manual' as const,
            lastEditedAt: new Date().toISOString()
          }
        }
      };
    });
    setEditingQuestionId(null);
  };

  // Handle save for partner-specific answers (same logic as manual save)
  const handleSavePartnerAnswer = (questionId: string) => {
    handleSaveManualAnswer(questionId);
  };

  // Handle AI generation for partner-specific question
  const handleGeneratePartnerQuestion = async (
    questionId: string,
    partner: ConsortiumPartner,
    baseQuestionId: string,
    chapterId: number,
    instruction?: string
  ) => {
    if (!pipelineState) return;
    trackAnswerChange(questionId);
    setGeneratingQuestionId(questionId);

    try {
      // CRITICAL: Ensure the pipeline state has the CURRENT knowledge pool!
      const stateWithCurrentKnowledge = {
        ...pipelineState,
        knowledgePool: projectKnowledgePool, // Always use the latest knowledge pool
      };
      console.log(`[handleGeneratePartnerQuestion] Partner: ${partner.name}, knowledgePool: ${projectKnowledgePool.documents?.length || 0} docs`);

      // Call the pipeline generation with partner-specific context
      const { generateSinglePartnerAnswer } = await import('@/lib/project-pipeline');
      const snippetsToPass = useAppStore.getState().snippets?.map(s => ({ title: s.title, content: s.content })) || [];

      const result = await generateSinglePartnerAnswer(
        stateWithCurrentKnowledge,
        partner,
        baseQuestionId,
        chapterId,
        language,
        instruction,
        snippetsToPass
      );

      setPipelineState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          answers: {
            ...prev.answers,
            [questionId]: result
          }
        };
      });
    } catch (e: any) {
      console.error('Partner question generation failed:', e);
    }
    setGeneratingQuestionId(null);
  };

  const renderQuestionsForStep = (stepId: number) => {
    if (!pipelineState) return null;

    // Find the chapter in the official structure
    const currentActionType = pipelineState.configuration?.actionType || actionType || 'KA220';
    const structure = getOfficialPipelineStructure(currentActionType);
    const chapter = structure.find(c => c.id === stepId);
    if (!chapter) return null;

    // SPECIAL HANDLING: Step 2 - Participating Organisations
    // Create a separate section for EACH partner
    if (stepId === 2 && pipelineState.consortium && pipelineState.consortium.length > 0) {
      const currentActionType = pipelineState.configuration?.actionType || actionType || 'KA220';
      const structure = getOfficialPipelineStructure(currentActionType);
      const orgChapter = structure.find(c => c.id === 2);
      const partnerQuestions = orgChapter?.sections[0]?.questions || [];

      return (
        <div className="space-y-6">
          {/* Partner Skills Matrix for Execution Phase (Step 2) */}
          <div className="mb-6">
            <PartnerSkillsMatrix
              partners={pipelineState.consortium}
              language={language}
            />
          </div>

          {pipelineState.consortium.map((partner, partnerIndex) => {
            const isPartnerExpanded = expandedSections[`partner_${partner.id}`] !== false; // Default expanded

            return (
              <div key={partner.id} className="border-2 border-[#003399]/20 rounded-lg overflow-hidden">
                {/* Partner Header */}
                <div
                  className="bg-gradient-to-r from-[#003399]/10 to-[#FFCC00]/10 px-4 py-3 cursor-pointer flex items-center justify-between"
                  onClick={() => setExpandedSections(prev => ({
                    ...prev,
                    [`partner_${partner.id}`]: !isPartnerExpanded
                  }))}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#003399] text-white flex items-center justify-center font-bold">
                      {partnerIndex + 1}
                    </div>
                    <div>
                      <h5 className="font-semibold text-[#003399]">{partner.name}</h5>
                      <p className="text-xs text-gray-500">
                        {partner.country} • {partner.isLead
                          ? (language === 'de' ? 'Koordinator' : 'Coordinator')
                          : (language === 'de' ? 'Partner' : 'Partner')
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Regenerate Partner Button */}
                    {partnerQuestions.some(q => pipelineState.answers?.[`${q.id}_${partner.id}`]) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-[#003399] hover:bg-blue-50 mr-2 border border-[#003399]/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExecuteStep(2, partnerIndex);
                        }}
                        disabled={isGenerating}
                        title={language === 'de' ? 'Texte für diesen Partner neu generieren' : 'Regenerate texts for this partner'}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${(isGenerating && currentStatus?.includes(partner.name)) ? 'animate-spin' : ''}`} />
                        {language === 'de' ? 'Neu generieren' : 'Regenerate'}
                      </Button>
                    )}

                    {/* Progress indicator for this partner */}
                    {partnerQuestions.map((q, qi) => {
                      const questionId = `${q.id}_${partner.id}`;
                      const hasAnswer = !!pipelineState.answers?.[questionId];
                      return (
                        <div
                          key={qi}
                          className={`w-3 h-3 rounded-full ${hasAnswer ? 'bg-green-500' : 'bg-gray-300'}`}
                          title={q.text.slice(0, 50) + '...'}
                        />
                      );
                    })}
                  </div>
                  {isPartnerExpanded ? <ChevronDown className="h-5 w-5 text-[#003399]" /> : <ChevronRight className="h-5 w-5 text-[#003399]" />}
                </div>


                {/* Partner Questions - Toggle-based */}
                {isPartnerExpanded && (
                  <div className="p-3 space-y-2 bg-gray-50">
                    {partnerQuestions.map((q, qIndex) => {
                      const questionId = `${q.id}_${partner.id}`;
                      const answer = pipelineState.answers?.[questionId];
                      const answerValue = getAnswerValue(answer);
                      const answerData = typeof answer === 'object' && 'mode' in answer ? answer as AnswerData : null;
                      const isEditing = editingQuestionId === questionId;
                      const isGenerating = generatingQuestionId === questionId;
                      const showImprove = showImproveInput[questionId];
                      const mode = questionEditMode[questionId] || answerData?.mode || 'ai';
                      const isQExpanded = expandedSections[`pq_${questionId}`] === true;
                      const hasAnswer = !!answerValue;

                      return (
                        <div key={qIndex} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                          {/* Toggle Header */}
                          <div
                            className={`px-3 py-2 cursor-pointer flex items-start gap-2 transition-colors ${isQExpanded ? 'bg-indigo-50 border-b border-indigo-100' : 'hover:bg-gray-50'
                              }`}
                            onClick={() => setExpandedSections(prev => ({
                              ...prev,
                              [`pq_${questionId}`]: !isQExpanded
                            }))}
                          >
                            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5 ${hasAnswer ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                              }`}>
                              {qIndex + 1}
                            </span>

                            <div className="flex-1 min-w-0">
                              <p className="text-base font-semibold text-slate-800 leading-snug">
                                {q.fullQuestion || q.text}
                              </p>
                              {/* Character limit indicator with counter */}
                              {q.charLimit && (
                                <span className={`text-xs font-medium mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded ${answerValue && answerValue.length > q.charLimit
                                  ? 'bg-red-100 text-red-600'
                                  : answerValue
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-gray-100 text-gray-500'
                                  }`}>
                                  {answerValue ? answerValue.length.toLocaleString() : 0} / {q.charLimit.toLocaleString()} {language === 'de' ? 'Zeichen' : 'chars'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {hasAnswer && !isQExpanded && (
                                <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">✓</span>
                              )}
                              {isQExpanded ? (
                                <ChevronDown className="h-4 w-4 text-indigo-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {isQExpanded && (
                            <div className="p-3 bg-white">
                              {isEditing && mode === 'manual' ? (
                                <div className="space-y-2">
                                  <RichTextEditor
                                    value={questionEditText[questionId] || answerValue}
                                    onChange={(val) => setQuestionEditText(prev => ({ ...prev, [questionId]: val }))}
                                    placeholder={language === 'de' ? 'Antwort hier eingeben...' : 'Enter answer here...'}
                                    minHeight="100px"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditingQuestionId(null)}>
                                      {language === 'de' ? 'Abbrechen' : 'Cancel'}
                                    </Button>
                                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleSavePartnerAnswer(questionId)}>
                                      💾 {language === 'de' ? 'Speichern' : 'Save'}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {q.helpText && (
                                    <div className="text-xs text-slate-500 mb-2 p-2 bg-blue-50/50 rounded border border-blue-100">
                                      {q.helpText.split('\n').map((line, i) => (
                                        <p key={i} className="mb-0.5 last:mb-0 flex items-start gap-1.5">
                                          <ArrowRight className="h-2.5 w-2.5 text-blue-400 mt-0.5 shrink-0" />
                                          <span>{line}</span>
                                        </p>
                                      ))}
                                    </div>
                                  )}

                                  {(() => {
                                    const isChanged = recentlyChangedQuestions.has(questionId);
                                    const hasPrev = !!previousAnswers[questionId];
                                    return (
                                      <div>
                                        <div className={`border-l-3 pl-4 mb-1 py-2 rounded-r transition-colors duration-500 ${isChanged
                                          ? 'border-green-500 bg-green-50/70'
                                          : 'border-[#FFCC00] bg-gray-50/50'
                                          }`}>
                                          {isChanged && (
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-xs font-medium text-green-700 flex items-center gap-1">
                                                <Sparkles className="h-3 w-3" />
                                                {language === 'de' ? 'Aktualisiert durch KI' : 'Updated by AI'}
                                              </span>
                                              <div className="flex items-center gap-1">
                                                {hasPrev && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setShowPreviousVersion(prev => ({ ...prev, [questionId]: !prev[questionId] }));
                                                    }}
                                                    className="text-[10px] text-green-600 hover:text-green-800 underline"
                                                  >
                                                    {showPreviousVersion[questionId]
                                                      ? (language === 'de' ? 'Vorherige Version ausblenden' : 'Hide previous')
                                                      : (language === 'de' ? 'Vorherige Version anzeigen' : 'Show previous')}
                                                  </button>
                                                )}
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); dismissChangeHighlight(questionId); }}
                                                  className="text-[10px] text-gray-400 hover:text-gray-600 ml-2"
                                                >✕</button>
                                              </div>
                                            </div>
                                          )}
                                          {answerValue ? (
                                            <div className="text-sm text-gray-800 leading-relaxed">
                                              {formatMarkdownToReact(answerValue)}
                                            </div>
                                          ) : (
                                            <p className="text-sm text-gray-400 italic">
                                              {language === 'de' ? 'Noch keine Antwort generiert' : 'No answer generated yet'}
                                            </p>
                                          )}
                                        </div>
                                        {/* Previous Version (collapsed by default) */}
                                        {isChanged && showPreviousVersion[questionId] && previousAnswers[questionId] && (
                                          <div className="border-l-3 border-gray-300 pl-4 mb-3 py-2 bg-gray-100/70 rounded-r opacity-70">
                                            <span className="text-[10px] font-medium text-gray-500">
                                              {language === 'de' ? 'Vorherige Version:' : 'Previous version:'}
                                            </span>
                                            <div className="text-sm text-gray-600 leading-relaxed mt-1">
                                              {formatMarkdownToReact(previousAnswers[questionId])}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {/* Compact Action Buttons */}
                                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t mt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] px-2 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowImproveInput(prev => ({ ...prev, [questionId]: !prev[questionId] }));
                                      }}
                                    >
                                      <Wand2 className="h-2.5 w-2.5 mr-1" />
                                      {language === 'de' ? 'KI verbessern' : 'AI Improve'}
                                    </Button>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] px-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setQuestionEditMode(prev => ({ ...prev, [questionId]: 'manual' }));
                                        setQuestionEditText(prev => ({ ...prev, [questionId]: answerValue }));
                                        setEditingQuestionId(questionId);
                                      }}
                                    >
                                      <Edit3 className="h-2.5 w-2.5 mr-1" />
                                      {language === 'de' ? 'Bearbeiten' : 'Edit'}
                                    </Button>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] px-2 bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (answerValue) handleSaveSnippet(questionId, q.text, answerValue);
                                      }}
                                      disabled={!answerValue || savedSnippetsStatus[questionId]}
                                    >
                                      {savedSnippetsStatus[questionId] ? (
                                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                      ) : (
                                        <BookmarkPlus className="h-2.5 w-2.5 mr-1" />
                                      )}
                                      {savedSnippetsStatus[questionId] ? (language === 'de' ? 'Gespeichert' : 'Saved') : (language === 'de' ? 'Snippet' : 'Snippet')}
                                    </Button>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] px-2 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        analyzeAnswer(questionId, q.text, answerValue);
                                      }}
                                      disabled={!!isAnalyzingQuestion || !answerValue}
                                    >
                                      {isAnalyzingQuestion === questionId ? (
                                        <RefreshCw className="h-2.5 w-2.5 mr-1 animate-spin" />
                                      ) : (
                                        <Sparkles className="h-2.5 w-2.5 mr-1" />
                                      )}
                                      {language === 'de' ? 'Prüfen' : 'Check'}
                                    </Button>

                                    {/* Document/Study Reference Button for Partners */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={`h-6 text-[10px] px-2 ${questionDocuments[questionId]?.length
                                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
                                        }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDocumentPicker(prev => ({ ...prev, [questionId]: !prev[questionId] }));
                                      }}
                                    >
                                      <FileText className="h-2.5 w-2.5 mr-1" />
                                      {questionDocuments[questionId]?.length
                                        ? `${questionDocuments[questionId].length} ${language === 'de' ? 'Dok.' : 'Doc.'}`
                                        : (language === 'de' ? '+ Quelle' : '+ Source')}
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-[10px] px-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 ml-auto"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleGeneratePartnerQuestion(questionId, partner, q.id, stepId);
                                      }}
                                      disabled={isGenerating}
                                    >
                                      <RefreshCw className={`h-2.5 w-2.5 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                                      {language === 'de' ? 'Neu' : 'Regen'}
                                    </Button>
                                  </div>

                                  {/* Document Picker for Partner Questions */}
                                  {showDocumentPicker[questionId] && (
                                    <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200 animate-in fade-in slide-in-from-top-2">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-amber-800">
                                          📚 {language === 'de' ? 'Quellen für Erfahrung/Expertise' : 'Sources for Experience/Expertise'}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowDocumentPicker(prev => ({ ...prev, [questionId]: false }));
                                          }}
                                          className="text-amber-600 hover:text-amber-800"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>

                                      {/* Partner Website Option */}
                                      {partner.crmId && (() => {
                                        const crmPartner = crmPartners.find(p => p.id === partner.crmId);
                                        return crmPartner?.website ? (
                                          <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <Globe className="h-3 w-3 text-blue-600" />
                                                <span className="text-xs text-blue-800 truncate max-w-[150px]">
                                                  {crmPartner.website}
                                                </span>
                                              </div>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 text-[10px] text-blue-600 hover:bg-blue-100"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleGeneratePartnerQuestion(
                                                    questionId,
                                                    partner,
                                                    q.id,
                                                    stepId,
                                                    `Analysiere die Website ${crmPartner.website} und extrahiere relevante Informationen über Erfahrungen, Projekte und Expertise dieser Organisation. Nutze diese Informationen um die Frage zu beantworten.`
                                                  );
                                                  setShowDocumentPicker(prev => ({ ...prev, [questionId]: false }));
                                                }}
                                                disabled={isGenerating}
                                              >
                                                <Globe className="h-2.5 w-2.5 mr-1" />
                                                {language === 'de' ? 'Website nutzen' : 'Use Website'}
                                              </Button>
                                            </div>
                                          </div>
                                        ) : null;
                                      })()}

                                      {/* Partner Documents */}
                                      {partner.crmId && (() => {
                                        const crmPartner = crmPartners.find(p => p.id === partner.crmId);
                                        const partnerDocs = crmPartner?.uploadedDocuments || [];
                                        return partnerDocs.length > 0 ? (
                                          <div className="mb-2">
                                            <span className="text-[10px] font-semibold text-amber-700 uppercase">
                                              {language === 'de' ? 'Partner-Dokumente:' : 'Partner Documents:'}
                                            </span>
                                            <div className="space-y-1 mt-1">
                                              {partnerDocs.map((doc, i) => (
                                                <label
                                                  key={i}
                                                  className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-amber-100"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={questionDocuments[questionId]?.includes(`partner_${partner.id}_${i}`)}
                                                    onChange={(e) => {
                                                      e.stopPropagation();
                                                      const docId = `partner_${partner.id}_${i}`;
                                                      setQuestionDocuments(prev => {
                                                        const current = prev[questionId] || [];
                                                        if (current.includes(docId)) {
                                                          return { ...prev, [questionId]: current.filter(id => id !== docId) };
                                                        } else {
                                                          return { ...prev, [questionId]: [...current, docId] };
                                                        }
                                                      });
                                                    }}
                                                    className="h-3 w-3 rounded text-amber-600"
                                                  />
                                                  <span className="text-xs text-amber-900 truncate flex-1">
                                                    {doc.name}
                                                  </span>
                                                </label>
                                              ))}
                                            </div>
                                          </div>
                                        ) : null;
                                      })()}

                                      {/* Project Knowledge Pool Documents */}
                                      {projectKnowledgePool.documents?.filter(d => d.status === 'ready').length > 0 && (
                                        <div className="mb-2">
                                          <span className="text-[10px] font-semibold text-indigo-700 uppercase">
                                            📁 {language === 'de' ? 'Projekt-Dokumente:' : 'Project Documents:'}
                                          </span>
                                          <div className="space-y-1 mt-1 max-h-20 overflow-y-auto">
                                            {projectKnowledgePool.documents.filter(d => d.status === 'ready').map(doc => {
                                              const docId = `proj_${doc.id}`;
                                              const isSelected = questionDocuments[questionId]?.includes(docId);
                                              return (
                                                <label
                                                  key={doc.id}
                                                  className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${isSelected ? 'bg-indigo-200' : 'hover:bg-indigo-100'
                                                    }`}
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                      e.stopPropagation();
                                                      setQuestionDocuments(prev => {
                                                        const current = prev[questionId] || [];
                                                        if (isSelected) {
                                                          return { ...prev, [questionId]: current.filter(id => id !== docId) };
                                                        } else {
                                                          return { ...prev, [questionId]: [...current, docId] };
                                                        }
                                                      });
                                                    }}
                                                    className="h-3 w-3 rounded text-indigo-600"
                                                  />
                                                  <FileText className="h-3 w-3 text-indigo-500 shrink-0" />
                                                  <span className="text-xs text-indigo-900 truncate flex-1">
                                                    {doc.name}
                                                  </span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* Project Knowledge Pool Websites */}
                                      {projectKnowledgePool.websites?.filter(w => w.status === 'ready').length > 0 && (
                                        <div className="mb-2">
                                          <span className="text-[10px] font-semibold text-teal-700 uppercase">
                                            🌐 {language === 'de' ? 'Projekt-Websites:' : 'Project Websites:'}
                                          </span>
                                          <div className="space-y-1 mt-1 max-h-20 overflow-y-auto">
                                            {projectKnowledgePool.websites.filter(w => w.status === 'ready').map(website => {
                                              const webId = `web_${website.id}`;
                                              const isSelected = questionDocuments[questionId]?.includes(webId);
                                              return (
                                                <label
                                                  key={website.id}
                                                  className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${isSelected ? 'bg-teal-200' : 'hover:bg-teal-100'
                                                    }`}
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                      e.stopPropagation();
                                                      setQuestionDocuments(prev => {
                                                        const current = prev[questionId] || [];
                                                        if (isSelected) {
                                                          return { ...prev, [questionId]: current.filter(id => id !== webId) };
                                                        } else {
                                                          return { ...prev, [questionId]: [...current, webId] };
                                                        }
                                                      });
                                                    }}
                                                    className="h-3 w-3 rounded text-teal-600"
                                                  />
                                                  <Globe className="h-3 w-3 text-teal-500 shrink-0" />
                                                  <span className="text-xs text-teal-900 truncate flex-1">
                                                    {website.title || website.url}
                                                  </span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* General Knowledge Base Studies */}
                                      {uploadedStudies.length > 0 && (
                                        <div className="mb-2">
                                          <span className="text-[10px] font-semibold text-amber-700 uppercase">
                                            📚 {language === 'de' ? 'Allg. Wissensdatenbank:' : 'General Knowledge Base:'}
                                          </span>
                                          <div className="space-y-1 mt-1 max-h-20 overflow-y-auto">
                                            {uploadedStudies.filter(s => s.status === 'ready').map(study => {
                                              const isSelected = questionDocuments[questionId]?.includes(study.id);
                                              return (
                                                <label
                                                  key={study.id}
                                                  className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${isSelected ? 'bg-amber-200' : 'hover:bg-amber-100'
                                                    }`}
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                      e.stopPropagation();
                                                      setQuestionDocuments(prev => {
                                                        const current = prev[questionId] || [];
                                                        if (isSelected) {
                                                          return { ...prev, [questionId]: current.filter(id => id !== study.id) };
                                                        } else {
                                                          return { ...prev, [questionId]: [...current, study.id] };
                                                        }
                                                      });
                                                    }}
                                                    className="h-3 w-3 rounded text-amber-600"
                                                  />
                                                  <span className="text-xs text-amber-900 truncate flex-1">
                                                    {study.fileName}
                                                  </span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {(projectKnowledgePool.documents?.length === 0 && projectKnowledgePool.websites?.length === 0 && uploadedStudies.length === 0) && (
                                        <p className="text-xs text-amber-600 italic mb-2">
                                          {language === 'de'
                                            ? 'Keine Quellen verfügbar. Füge Dokumente zum Projekt-Wissens-Pool hinzu.'
                                            : 'No sources available. Add documents to the project knowledge pool.'}
                                        </p>
                                      )}

                                      {questionDocuments[questionId]?.length > 0 && (
                                        <div className="pt-2 border-t border-amber-200">
                                          <Button
                                            size="sm"
                                            className="w-full h-6 text-[10px] bg-amber-600 hover:bg-amber-700 text-white"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Collect all selected documents from all sources
                                              const selectedIds = questionDocuments[questionId] || [];

                                              // Project documents
                                              const projDocs = projectKnowledgePool.documents?.filter(d =>
                                                selectedIds.includes(`proj_${d.id}`)
                                              ) || [];

                                              // Project websites
                                              const projWebs = projectKnowledgePool.websites?.filter(w =>
                                                selectedIds.includes(`web_${w.id}`)
                                              ) || [];

                                              // General studies
                                              const generalDocs = uploadedStudies.filter(s =>
                                                selectedIds.includes(s.id)
                                              );

                                              // Build context
                                              const docContext = [
                                                ...projDocs.map(d =>
                                                  `📄 ${d.name}:\n${d.summary || ''}\n${d.keyFindings?.join('\n') || d.extractedText?.slice(0, 2000) || ''}`
                                                ),
                                                ...projWebs.map(w =>
                                                  `🌐 ${w.title || w.url}:\n${w.summary || ''}\n${w.keyPoints?.join('\n') || w.extractedText?.slice(0, 1500) || ''}`
                                                ),
                                                ...generalDocs.map(d =>
                                                  `📚 ${d.fileName}:\n${d.summary?.keyFindings?.join('\n') || d.textContent?.slice(0, 2000) || ''}`
                                                ),
                                              ].join('\n\n---\n\n');

                                              handleGeneratePartnerQuestion(
                                                questionId,
                                                partner,
                                                q.id,
                                                stepId,
                                                `Beantworte diese Frage unter Verwendung der folgenden Quellen für die Erfahrung und Expertise der Organisation. Zitiere spezifische Projekte, Fakten und Statistiken:\n\n${docContext}`
                                              );
                                              setShowDocumentPicker(prev => ({ ...prev, [questionId]: false }));
                                            }}
                                            disabled={isGenerating}
                                          >
                                            <Wand2 className="h-2.5 w-2.5 mr-1" />
                                            {language === 'de' ? 'Mit Quellen generieren' : 'Generate with sources'}
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Improve Input with Quick Actions */}
                                  {showImprove && (
                                    <div className="mt-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                                      <div className="flex gap-2 mb-2">
                                        <Input
                                          value={questionImproveInstruction[questionId] || ''}
                                          onChange={(e) => setQuestionImproveInstruction(prev => ({ ...prev, [questionId]: e.target.value }))}
                                          placeholder={language === 'de' ? 'z.B. "Mehr Details..."' : 'e.g. "More details..."'}
                                          className="flex-1 text-xs h-7 bg-white"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <Button
                                          size="sm"
                                          className="h-7 bg-indigo-600 hover:bg-indigo-700 text-white px-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleGeneratePartnerQuestion(questionId, partner, q.id, stepId, questionImproveInstruction[questionId]);
                                          }}
                                          disabled={isGenerating || !questionImproveInstruction[questionId]?.trim()}
                                        >
                                          {isGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                                        </Button>
                                      </div>

                                      {/* Quick Actions for Partner Questions */}
                                      <div className="flex flex-wrap gap-1">
                                        {[
                                          { emoji: '🏆', label: language === 'de' ? 'Projekte' : 'Projects', instruction: language === 'de' ? 'Füge mehr Details zu früheren relevanten Projekten hinzu, insbesondere EU-geförderte Projekte' : 'Add more details about previous relevant projects, especially EU-funded projects' },
                                          { emoji: '👥', label: language === 'de' ? 'Team' : 'Team', instruction: language === 'de' ? 'Beschreibe das Team und die Expertise der Mitarbeiter detaillierter' : 'Describe the team and staff expertise in more detail' },
                                          { emoji: '🎯', label: language === 'de' ? 'Rolle' : 'Role', instruction: language === 'de' ? 'Betone die spezifische Rolle und den Mehrwert dieser Organisation im Konsortium' : 'Emphasize the specific role and added value of this organization in the consortium' },
                                          { emoji: '🌍', label: language === 'de' ? 'Netzwerk' : 'Network', instruction: language === 'de' ? 'Beschreibe das Netzwerk und die Reichweite der Organisation zu den Zielgruppen' : 'Describe the network and reach of the organization to target groups' },
                                        ].map((chip, i) => (
                                          <button
                                            key={i}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleGeneratePartnerQuestion(questionId, partner, q.id, stepId, chip.instruction);
                                            }}
                                            disabled={isGenerating}
                                            className="px-2 py-1 text-[10px] bg-white border border-indigo-200 rounded-full hover:bg-indigo-100 hover:border-indigo-400 transition-colors disabled:opacity-50"
                                          >
                                            {chip.emoji} {chip.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Compact Feedback Card */}
                                  {questionFeedback[questionId] && (
                                    <div className="mt-2 bg-white rounded-lg border border-purple-100 shadow-sm overflow-hidden">
                                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-3 py-2 flex justify-between items-center border-b border-purple-100">
                                        <div className="flex items-center gap-2">
                                          <div className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-white text-xs ${questionFeedback[questionId].score >= 8 ? 'bg-green-500' :
                                            questionFeedback[questionId].score >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}>
                                            {questionFeedback[questionId].score}
                                          </div>
                                          <span className="text-xs font-semibold text-purple-900">Quality</span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0 hover:bg-purple-100 rounded-full"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setQuestionFeedback(prev => {
                                              const next = { ...prev };
                                              delete next[questionId];
                                              return next;
                                            });
                                          }}
                                        >
                                          <X className="h-3 w-3 text-purple-400" />
                                        </Button>
                                      </div>
                                      <div className="p-3 space-y-3">
                                        {/* Score */}
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-500">{language === 'de' ? 'Bewertung:' : 'Score:'}</span>
                                          <span className={`text-sm font-bold ${questionFeedback[questionId].score >= 7 ? 'text-green-600' : questionFeedback[questionId].score >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                            {questionFeedback[questionId].score}/10
                                          </span>
                                        </div>

                                        {/* Improvements List with Checkboxes */}
                                        {questionFeedback[questionId].improvements?.length > 0 ? (
                                          <div className="space-y-2">
                                            <h6 className="text-xs font-semibold text-gray-700">
                                              {language === 'de' ? 'Verbesserungsvorschläge (auswählen):' : 'Improvement suggestions (select):'}
                                            </h6>
                                            {questionFeedback[questionId].improvements.map((imp, i) => (
                                              <div
                                                key={i}
                                                className={`p-2 rounded-lg border transition-all cursor-pointer ${imp.selected
                                                  ? 'bg-purple-50 border-purple-300'
                                                  : 'bg-gray-50 border-gray-200 hover:border-purple-200'
                                                  }`}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setQuestionFeedback(prev => ({
                                                    ...prev,
                                                    [questionId]: {
                                                      ...prev[questionId],
                                                      improvements: prev[questionId].improvements.map((item, idx) =>
                                                        idx === i ? { ...item, selected: !item.selected } : item
                                                      )
                                                    }
                                                  }));
                                                }}
                                              >
                                                <div className="flex items-start gap-2">
                                                  <input
                                                    type="checkbox"
                                                    checked={imp.selected || false}
                                                    onChange={() => { }}
                                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                  />
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-800">{imp.issue}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{imp.suggestion}</p>
                                                    {imp.selected && imp.improvedText && (
                                                      <div className="mt-2 p-2 bg-white rounded border border-purple-200 text-xs text-gray-700">
                                                        <span className="text-purple-600 font-medium">{language === 'de' ? 'Vorschlag: ' : 'Suggestion: '}</span>
                                                        {imp.improvedText}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}

                                            {/* Apply Selected Button */}
                                            {questionFeedback[questionId].improvements.some(imp => imp.selected) && (
                                              <Button
                                                className="w-full bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs mt-2"
                                                size="sm"
                                                disabled={isGenerating}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  trackAnswerChange(questionId);

                                                  // Create auto-fix instruction from selected improvements
                                                  const fixInstruction = "Auto-Fix folgende Schwachstellen:\n" + questionFeedback[questionId].improvements
                                                    .filter(imp => imp.selected)
                                                    .map(imp => `- Problem: ${imp.issue}\n  Lösung: ${imp.suggestion}`)
                                                    .join('\n');

                                                  handleGeneratePartnerQuestion(questionId, partner, q.id, stepId, fixInstruction);

                                                  setQuestionFeedback(prev => {
                                                    const next = { ...prev };
                                                    delete next[questionId];
                                                    return next;
                                                  });
                                                }}
                                              >
                                                {isGenerating ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                                                {language === 'de'
                                                  ? `${questionFeedback[questionId].improvements.filter(i => i.selected).length} Änderung(en) mit AI anwenden`
                                                  : `Magic Fix ${questionFeedback[questionId].improvements.filter(i => i.selected).length} change(s)`}
                                              </Button>
                                            )}
                                          </div>
                                        ) : (
                                          /* Legacy format fallback */
                                          (questionFeedback[questionId].weaknesses?.length ?? 0) > 0 && (
                                            <div>
                                              <h6 className="text-xs font-semibold text-gray-700 mb-2">
                                                {language === 'de' ? 'Verbesserungsvorschläge:' : 'Suggestions:'}
                                              </h6>
                                              <ul className="text-xs space-y-1 text-gray-600">
                                                {(questionFeedback[questionId].weaknesses ?? []).map((w, i) => (
                                                  <li key={i} className="flex items-start gap-1">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                                    <span>{w.replace(/\*\*/g, '')}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // STANDARD HANDLING: All other steps with TOGGLE UI
    // Build questions list with full question data from official structure
    const allQuestions: {
      sectionTitle: string;
      question: string;
      fullQuestion: string;
      questionId: string;
      helpText?: string;
      wordLimit?: string;
      charLimit?: number;
    }[] = [];

    chapter.sections.forEach(section => {
      section.questions.forEach(q => {
        if (q.type === 'info') return;
        allQuestions.push({
          sectionTitle: section.title,
          question: q.text,
          fullQuestion: q.fullQuestion || q.text, // Fall back to short text if no full question
          questionId: q.id,
          helpText: q.helpText,
          wordLimit: q.wordLimit,
          charLimit: q.charLimit
        });
      });
    });

    if (allQuestions.length === 0) return null;

    // Group by section
    const groupedBySection: Record<string, typeof allQuestions> = {};
    allQuestions.forEach(item => {
      if (!groupedBySection[item.sectionTitle]) {
        groupedBySection[item.sectionTitle] = [];
      }
      groupedBySection[item.sectionTitle].push(item);
    });

    return (
      <div className="space-y-4">
        {Object.entries(groupedBySection).map(([sectionTitle, questions], sectionIndex) => (
          <div key={sectionIndex} className="space-y-2">
            {/* Section Header */}
            <h5 className="text-sm font-semibold text-[#003399] border-b pb-1 flex items-center gap-2 mb-3">
              <FileText className="h-3.5 w-3.5" />
              {sectionTitle}
            </h5>

            {/* Knowledge Box - Show if there are sources available */}
            {(projectKnowledgePool.documents?.length > 0 ||
              projectKnowledgePool.websites?.length > 0 ||
              projectKnowledgePool.notes?.length > 0) && sectionIndex === 0 && (
                <div className="mb-4">
                  <KnowledgeBox
                    documents={projectKnowledgePool.documents || []}
                    websites={projectKnowledgePool.websites || []}
                    notes={projectKnowledgePool.notes || []}
                    language={language as 'de' | 'en'}
                    onUseContent={(content) => {
                      // Find the first question in this section that doesn't have an answer
                      const firstUnansweredQuestion = questions.find(q => !pipelineState.answers?.[q.questionId]);
                      if (firstUnansweredQuestion && pipelineState) {
                        setPipelineState(prev => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            answers: {
                              ...prev.answers,
                              [firstUnansweredQuestion.questionId]: {
                                value: content,
                                mode: 'manual' as const,
                                lastEditedAt: new Date().toISOString()
                              } as AnswerData
                            }
                          };
                        });
                      }
                    }}
                  />
                </div>
              )}

            {/* Questions as Toggles */}
            {questions.map((item, qIndex) => {
              const answer = pipelineState.answers?.[item.questionId];
              const answerValue = getAnswerValue(answer);
              const answerData = typeof answer === 'object' && 'mode' in answer ? answer as AnswerData : null;
              const isEditing = editingQuestionId === item.questionId;
              const isGenerating = generatingQuestionId === item.questionId;
              const showImprove = showImproveInput[item.questionId];
              const mode = questionEditMode[item.questionId] || answerData?.mode || 'ai';
              const isExpanded = expandedSections[`q_${item.questionId}`] === true;
              const hasAnswer = !!answerValue;

              return (
                <div key={qIndex} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                  {/* Toggle Header - Clickable Question */}
                  <div
                    className={`px-3 py-2.5 cursor-pointer flex items-start gap-2 transition-colors ${isExpanded ? 'bg-indigo-50 border-b border-indigo-100' : 'hover:bg-gray-50'
                      }`}
                    onClick={() => setExpandedSections(prev => ({
                      ...prev,
                      [`q_${item.questionId}`]: !isExpanded
                    }))}
                  >
                    {/* Number Badge */}
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5 ${hasAnswer ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                      {qIndex + 1}
                    </span>

                    {/* Question Text (Full English Question) */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-slate-800 leading-snug">
                        {item.fullQuestion}
                      </p>
                      {/* Character limit indicator with counter */}
                      {item.charLimit && (
                        <span className={`text-xs font-medium mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded ${answerValue && answerValue.length > item.charLimit
                          ? 'bg-red-100 text-red-600'
                          : answerValue
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-500'
                          }`}>
                          {answerValue ? answerValue.length.toLocaleString() : 0} / {item.charLimit.toLocaleString()} {language === 'de' ? 'Zeichen' : 'chars'}
                        </span>
                      )}
                    </div>

                    {/* Status & Expand Icon */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasAnswer && !isExpanded && (
                        <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                          ✓
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-indigo-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content - Answer & Actions */}
                  {isExpanded && (
                    <div className="p-3 bg-white">
                      {isEditing && mode === 'manual' ? (
                        /* Manual Edit Mode */
                        <div className="space-y-2">
                          <RichTextEditor
                            value={questionEditText[item.questionId] || answerValue}
                            onChange={(val) => setQuestionEditText(prev => ({ ...prev, [item.questionId]: val }))}
                            placeholder={language === 'de' ? 'Antwort hier eingeben...' : 'Enter answer here...'}
                            minHeight="100px"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setEditingQuestionId(null)}
                            >
                              {language === 'de' ? 'Abbrechen' : 'Cancel'}
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              onClick={() => handleSaveManualAnswer(item.questionId)}
                            >
                              💾 {language === 'de' ? 'Speichern' : 'Save'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Display Mode */
                        <>
                          {/* Help Text */}
                          {item.helpText && (
                            <div className="text-xs text-slate-500 mb-2 p-2 bg-blue-50/50 rounded border border-blue-100">
                              {item.helpText.split('\n').map((line, i) => (
                                <p key={i} className="mb-0.5 last:mb-0 flex items-start gap-1.5">
                                  <ArrowRight className="h-2.5 w-2.5 text-blue-400 mt-0.5 shrink-0" />
                                  <span>{line}</span>
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Answer Content */}
                          {(() => {
                            const isChanged = recentlyChangedQuestions.has(item.questionId);
                            const hasPrev = !!previousAnswers[item.questionId];
                            return (
                              <div>
                                <div className={`border-l-3 pl-4 mb-1 py-2 rounded-r transition-colors duration-500 ${isChanged
                                  ? 'border-green-500 bg-green-50/70'
                                  : 'border-[#FFCC00] bg-gray-50/50'
                                  }`}>
                                  {isChanged && (
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-green-700 flex items-center gap-1">
                                        <Sparkles className="h-3 w-3" />
                                        {language === 'de' ? 'Aktualisiert durch KI' : 'Updated by AI'}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {hasPrev && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowPreviousVersion(prev => ({ ...prev, [item.questionId]: !prev[item.questionId] }));
                                            }}
                                            className="text-[10px] text-green-600 hover:text-green-800 underline"
                                          >
                                            {showPreviousVersion[item.questionId]
                                              ? (language === 'de' ? 'Vorherige Version ausblenden' : 'Hide previous')
                                              : (language === 'de' ? 'Vorherige Version anzeigen' : 'Show previous')}
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); dismissChangeHighlight(item.questionId); }}
                                          className="text-[10px] text-gray-400 hover:text-gray-600 ml-2"
                                        >✕</button>
                                      </div>
                                    </div>
                                  )}
                                  {answerValue ? (
                                    <div className="text-sm text-gray-800 leading-relaxed">
                                      {formatMarkdownToReact(answerValue)}
                                      {answerData?.sources && answerData.sources.length > 0 && (
                                        <div className="mt-2 text-xs text-gray-500">
                                          📚 Quellen: {answerData.sources.join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 italic">
                                      {language === 'de' ? 'Noch keine Antwort generiert' : 'No answer generated yet'}
                                    </p>
                                  )}
                                </div>
                                {/* Previous Version (collapsed by default) */}
                                {isChanged && showPreviousVersion[item.questionId] && previousAnswers[item.questionId] && (
                                  <div className="border-l-3 border-gray-300 pl-4 mb-3 py-2 bg-gray-100/70 rounded-r opacity-70">
                                    <span className="text-[10px] font-medium text-gray-500">
                                      {language === 'de' ? 'Vorherige Version:' : 'Previous version:'}
                                    </span>
                                    <div className="text-sm text-gray-600 leading-relaxed mt-1">
                                      {formatMarkdownToReact(previousAnswers[item.questionId])}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Action Buttons - Compact */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowImproveInput(prev => ({ ...prev, [item.questionId]: !prev[item.questionId] }));
                              }}
                            >
                              <Wand2 className="h-2.5 w-2.5 mr-1" />
                              {language === 'de' ? 'KI verbessern' : 'AI Improve'}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuestionEditMode(prev => ({ ...prev, [item.questionId]: 'manual' }));
                                setQuestionEditText(prev => ({ ...prev, [item.questionId]: answerValue }));
                                setEditingQuestionId(item.questionId);
                              }}
                            >
                              <Edit3 className="h-2.5 w-2.5 mr-1" />
                              {language === 'de' ? 'Bearbeiten' : 'Edit'}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (answerValue) handleSaveSnippet(item.questionId, item.fullQuestion, answerValue);
                              }}
                              disabled={!answerValue || savedSnippetsStatus[item.questionId]}
                            >
                              {savedSnippetsStatus[item.questionId] ? (
                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                              ) : (
                                <BookmarkPlus className="h-2.5 w-2.5 mr-1" />
                              )}
                              {savedSnippetsStatus[item.questionId] ? (language === 'de' ? 'Gespeichert' : 'Saved') : (language === 'de' ? 'Snippet' : 'Snippet')}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                analyzeAnswer(item.questionId, item.question, answerValue);
                              }}
                              disabled={!!isAnalyzingQuestion || !answerValue}
                            >
                              {isAnalyzingQuestion === item.questionId ? (
                                <RefreshCw className="h-2.5 w-2.5 mr-1 animate-spin" />
                              ) : (
                                <Sparkles className="h-2.5 w-2.5 mr-1" />
                              )}
                              {language === 'de' ? 'Prüfen' : 'Check'}
                            </Button>

                            {/* Document/Study Reference Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-6 text-[10px] px-2 ${questionDocuments[item.questionId]?.length
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
                                }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDocumentPicker(prev => ({ ...prev, [item.questionId]: !prev[item.questionId] }));
                              }}
                            >
                              <FileText className="h-2.5 w-2.5 mr-1" />
                              {questionDocuments[item.questionId]?.length
                                ? `${questionDocuments[item.questionId].length} ${language === 'de' ? 'Dok.' : 'Doc.'}`
                                : (language === 'de' ? '+ Quelle' : '+ Source')}
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 ml-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRegenerateQuestion(item.questionId, stepId);
                              }}
                              disabled={isGenerating}
                            >
                              <RefreshCw className={`h-2.5 w-2.5 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                              {language === 'de' ? 'Neu' : 'Regen'}
                            </Button>
                          </div>

                          {/* Document Picker Dropdown */}
                          {showDocumentPicker[item.questionId] && (
                            <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200 animate-in fade-in slide-in-from-top-2">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-amber-800">
                                  {language === 'de' ? '📚 Quellen für diese Frage' : '📚 Sources for this question'}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDocumentPicker(prev => ({ ...prev, [item.questionId]: false }));
                                  }}
                                  className="text-amber-600 hover:text-amber-800"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>

                              {/* Project Knowledge Pool Documents */}
                              {projectKnowledgePool.documents?.filter(d => d.status === 'ready').length > 0 && (
                                <div className="mb-2">
                                  <span className="text-[10px] font-semibold text-amber-700 uppercase">
                                    {language === 'de' ? 'Projekt-Dokumente:' : 'Project Documents:'}
                                  </span>
                                  <div className="space-y-1 mt-1">
                                    {projectKnowledgePool.documents.filter(d => d.status === 'ready').map(doc => {
                                      const isSelected = questionDocuments[item.questionId]?.includes(`proj_${doc.id}`);
                                      return (
                                        <label
                                          key={doc.id}
                                          className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${isSelected ? 'bg-amber-200' : 'hover:bg-amber-100'
                                            }`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              const docId = `proj_${doc.id}`;
                                              setQuestionDocuments(prev => {
                                                const current = prev[item.questionId] || [];
                                                if (isSelected) {
                                                  return { ...prev, [item.questionId]: current.filter(id => id !== docId) };
                                                } else {
                                                  return { ...prev, [item.questionId]: [...current, docId] };
                                                }
                                              });
                                            }}
                                            className="h-3 w-3 rounded text-amber-600"
                                          />
                                          <FileText className="h-3 w-3 text-amber-600 shrink-0" />
                                          <span className="text-xs text-amber-900 truncate flex-1">
                                            {doc.name}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Project Knowledge Pool Websites */}
                              {projectKnowledgePool.websites?.filter(w => w.status === 'ready').length > 0 && (
                                <div className="mb-2">
                                  <span className="text-[10px] font-semibold text-amber-700 uppercase">
                                    {language === 'de' ? 'Projekt-Websites:' : 'Project Websites:'}
                                  </span>
                                  <div className="space-y-1 mt-1">
                                    {projectKnowledgePool.websites.filter(w => w.status === 'ready').map(website => {
                                      const isSelected = questionDocuments[item.questionId]?.includes(`web_${website.id}`);
                                      return (
                                        <label
                                          key={website.id}
                                          className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${isSelected ? 'bg-amber-200' : 'hover:bg-amber-100'
                                            }`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              const webId = `web_${website.id}`;
                                              setQuestionDocuments(prev => {
                                                const current = prev[item.questionId] || [];
                                                if (isSelected) {
                                                  return { ...prev, [item.questionId]: current.filter(id => id !== webId) };
                                                } else {
                                                  return { ...prev, [item.questionId]: [...current, webId] };
                                                }
                                              });
                                            }}
                                            className="h-3 w-3 rounded text-amber-600"
                                          />
                                          <Globe className="h-3 w-3 text-blue-600 shrink-0" />
                                          <span className="text-xs text-amber-900 truncate flex-1">
                                            {website.title || website.url}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* General Knowledge Base Studies */}
                              {uploadedStudies.filter(s => s.status === 'ready').length > 0 && (
                                <div className="mb-2">
                                  <span className="text-[10px] font-semibold text-amber-700 uppercase">
                                    {language === 'de' ? 'Allgemeine Wissensdatenbank:' : 'General Knowledge Base:'}
                                  </span>
                                  <div className="space-y-1 mt-1 max-h-24 overflow-y-auto">
                                    {uploadedStudies.filter(s => s.status === 'ready').map(study => {
                                      const isSelected = questionDocuments[item.questionId]?.includes(study.id);
                                      return (
                                        <label
                                          key={study.id}
                                          className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${isSelected ? 'bg-amber-200' : 'hover:bg-amber-100'
                                            }`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              setQuestionDocuments(prev => {
                                                const current = prev[item.questionId] || [];
                                                if (isSelected) {
                                                  return { ...prev, [item.questionId]: current.filter(id => id !== study.id) };
                                                } else {
                                                  return { ...prev, [item.questionId]: [...current, study.id] };
                                                }
                                              });
                                            }}
                                            className="h-3 w-3 rounded text-amber-600"
                                          />
                                          <span className="text-xs text-amber-900 truncate flex-1">
                                            {study.fileName}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Empty State */}
                              {(!projectKnowledgePool.documents?.length && !projectKnowledgePool.websites?.length && !uploadedStudies.length) && (
                                <p className="text-xs text-amber-600 italic">
                                  {language === 'de'
                                    ? 'Keine Dokumente vorhanden. Lade Quellen in der Projekt-Wissensdatenbank hoch.'
                                    : 'No documents available. Upload sources in the Project Knowledge Base.'}
                                </p>
                              )}

                              {questionDocuments[item.questionId]?.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-amber-200">
                                  <Button
                                    size="sm"
                                    className="w-full h-6 text-[10px] bg-amber-600 hover:bg-amber-700 text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Collect all selected documents
                                      const selectedIds = questionDocuments[item.questionId] || [];

                                      // Project documents
                                      const projDocs = projectKnowledgePool.documents?.filter(d =>
                                        selectedIds.includes(`proj_${d.id}`)
                                      ) || [];

                                      // Project websites
                                      const projWebs = projectKnowledgePool.websites?.filter(w =>
                                        selectedIds.includes(`web_${w.id}`)
                                      ) || [];

                                      // General studies
                                      const generalDocs = uploadedStudies.filter(s =>
                                        selectedIds.includes(s.id)
                                      );

                                      // Build context
                                      const docContext = [
                                        ...projDocs.map(d =>
                                          `📄 ${d.name}:\n${d.summary || ''}\n${d.keyFindings?.join('\n') || d.extractedText?.slice(0, 2000) || ''}`
                                        ),
                                        ...projWebs.map(w =>
                                          `🌐 ${w.title || w.url}:\n${w.summary || ''}\n${w.keyPoints?.join('\n') || w.extractedText?.slice(0, 1500) || ''}`
                                        ),
                                        ...generalDocs.map(d =>
                                          `📚 ${d.fileName}:\n${d.summary?.keyFindings?.join('\n') || d.textContent?.slice(0, 2000) || ''}`
                                        ),
                                      ].join('\n\n---\n\n');

                                      handleRegenerateQuestion(
                                        item.questionId,
                                        stepId,
                                        `Beantworte diese Frage unter Verwendung der folgenden Quellen. Zitiere spezifische Fakten, Statistiken und Informationen daraus:\n\n${docContext}`
                                      );
                                      setShowDocumentPicker(prev => ({ ...prev, [item.questionId]: false }));
                                    }}
                                    disabled={isGenerating}
                                  >
                                    <Wand2 className="h-2.5 w-2.5 mr-1" />
                                    {language === 'de' ? 'Mit diesen Quellen generieren' : 'Generate with these sources'}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Feedback Card - Compact with Selectable Improvements */}
                          {questionFeedback[item.questionId] && (
                            <div className="mt-2 bg-white rounded-lg border border-purple-100 shadow-sm overflow-hidden">
                              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-3 py-2 flex justify-between items-center border-b border-purple-100">
                                <div className="flex items-center gap-2">
                                  <div className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-white text-xs ${questionFeedback[item.questionId].score >= 8 ? 'bg-green-500' :
                                    questionFeedback[item.questionId].score >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}>
                                    {questionFeedback[item.questionId].score}
                                  </div>
                                  <span className="text-xs font-semibold text-purple-900">
                                    {language === 'de' ? 'Qualitäts-Check' : 'Quality Check'}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-purple-100 rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuestionFeedback(prev => {
                                      const next = { ...prev };
                                      delete next[item.questionId];
                                      return next;
                                    });
                                  }}
                                >
                                  <X className="h-3 w-3 text-purple-400" />
                                </Button>
                              </div>

                              <div className="p-3 space-y-3">
                                {/* Score */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{language === 'de' ? 'Bewertung:' : 'Score:'}</span>
                                  <span className={`text-sm font-bold ${questionFeedback[item.questionId].score >= 7 ? 'text-green-600' : questionFeedback[item.questionId].score >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {questionFeedback[item.questionId].score}/10
                                  </span>
                                </div>

                                {/* Improvements List with Checkboxes */}
                                {questionFeedback[item.questionId].improvements?.length > 0 ? (
                                  <div className="space-y-2">
                                    <h6 className="text-xs font-semibold text-gray-700">
                                      {language === 'de' ? 'Verbesserungsvorschläge (auswählen):' : 'Improvement suggestions (select):'}
                                    </h6>
                                    {questionFeedback[item.questionId].improvements.map((imp, i) => (
                                      <div
                                        key={i}
                                        className={`p-2 rounded-lg border transition-all cursor-pointer ${imp.selected
                                          ? 'bg-purple-50 border-purple-300'
                                          : 'bg-gray-50 border-gray-200 hover:border-purple-200'
                                          }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setQuestionFeedback(prev => ({
                                            ...prev,
                                            [item.questionId]: {
                                              ...prev[item.questionId],
                                              improvements: prev[item.questionId].improvements.map((impItem, idx) =>
                                                idx === i ? { ...impItem, selected: !impItem.selected } : impItem
                                              )
                                            }
                                          }));
                                        }}
                                      >
                                        <div className="flex items-start gap-2">
                                          <input
                                            type="checkbox"
                                            checked={imp.selected || false}
                                            onChange={() => { }}
                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-800">{imp.issue?.replace(/\*\*/g, '').replace(/##/g, '').replace(/###/g, '')}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{imp.suggestion?.replace(/\*\*/g, '').replace(/##/g, '').replace(/###/g, '')}</p>
                                            {imp.selected && imp.improvedText && (
                                              <div className="mt-2 p-2 bg-white rounded border border-purple-200 text-xs text-gray-700">
                                                <span className="text-purple-600 font-medium">{language === 'de' ? 'Vorschlag: ' : 'Suggestion: '}</span>
                                                {imp.improvedText}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}

                                    {/* Apply Selected Button */}
                                    {questionFeedback[item.questionId].improvements.some(imp => imp.selected) && (
                                      <Button
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs mt-2"
                                        size="sm"
                                        disabled={generatingQuestionId === item.questionId}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          trackAnswerChange(item.questionId);

                                          // Create auto-fix instruction from selected improvements
                                          const fixInstruction = "Auto-Fix folgende Schwachstellen:\n" + questionFeedback[item.questionId].improvements
                                            .filter(imp => imp.selected)
                                            .map(imp => `- Problem: ${imp.issue}\n  Lösung: ${imp.suggestion}`)
                                            .join('\n');

                                          handleRegenerateQuestion(item.questionId, stepId, fixInstruction);

                                          setQuestionFeedback(prev => {
                                            const next = { ...prev };
                                            delete next[item.questionId];
                                            return next;
                                          });
                                        }}
                                      >
                                        {generatingQuestionId === item.questionId ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                                        {language === 'de'
                                          ? `${questionFeedback[item.questionId].improvements.filter(i => i.selected).length} Änderung(en) mit AI anwenden`
                                          : `Magic Fix ${questionFeedback[item.questionId].improvements.filter(i => i.selected).length} change(s)`}
                                      </Button>
                                    )}
                                  </div>
                                ) : (
                                  /* Legacy format fallback for old weaknesses format */
                                  (questionFeedback[item.questionId].weaknesses?.length ?? 0) > 0 && (
                                    <div>
                                      <h6 className="text-xs font-semibold text-gray-700 mb-2">
                                        {language === 'de' ? 'Verbesserungsvorschläge:' : 'Suggestions:'}
                                      </h6>
                                      <ul className="text-xs space-y-1 text-gray-600">
                                        {(questionFeedback[item.questionId].weaknesses ?? []).map((w, i) => (
                                          <li key={i} className="flex items-start gap-1">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                            <span>{w.replace(/\*\*/g, '').replace(/##/g, '').replace(/###/g, '')}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* Improve Instruction Input */}
                          {showImprove && (
                            <div className="mt-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                              <div className="flex gap-2 mb-2">
                                <Input
                                  value={questionImproveInstruction[item.questionId] || ''}
                                  onChange={(e) => setQuestionImproveInstruction(prev => ({ ...prev, [item.questionId]: e.target.value }))}
                                  placeholder={language === 'de' ? 'z.B. "Mehr Details..."' : 'e.g. "More details..."'}
                                  className="flex-1 text-xs h-7 bg-white"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button
                                  size="sm"
                                  className="h-7 bg-indigo-600 hover:bg-indigo-700 text-white px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRegenerateQuestion(item.questionId, stepId, questionImproveInstruction[item.questionId]);
                                  }}
                                  disabled={isGenerating || !questionImproveInstruction[item.questionId]?.trim()}
                                >
                                  {isGenerating ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <ArrowRight className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>

                              {/* Quick Actions */}
                              <div className="flex flex-wrap gap-1">
                                {[
                                  { emoji: '🇪🇺', label: language === 'de' ? 'EU-Prioritäten' : 'EU Priorities', instruction: language === 'de' ? 'Verknüpfe die Antwort stärker mit den Erasmus+ EU-Prioritäten: Inklusion & Vielfalt, Digitale Transformation, Umwelt & Klimaschutz, Demokratische Teilhabe' : 'Link the answer stronger to Erasmus+ EU priorities: Inclusion & Diversity, Digital Transformation, Environment & Climate, Democratic Participation' },
                                  { emoji: '📊', label: language === 'de' ? 'Statistiken' : 'Statistics', instruction: language === 'de' ? 'Füge relevante Statistiken, Zahlen und Daten hinzu um die Aussagen zu belegen' : 'Add relevant statistics, numbers and data to support the statements' },
                                  { emoji: '✂️', label: language === 'de' ? 'Kürzer' : 'Shorter', instruction: language === 'de' ? 'Formuliere kürzer und prägnanter, ohne wichtige Informationen zu verlieren' : 'Make it shorter and more concise without losing important information' },
                                  { emoji: '🎯', label: language === 'de' ? 'Zielgruppe' : 'Target Group', instruction: language === 'de' ? 'Betone die Relevanz und den Mehrwert für die Zielgruppen stärker' : 'Emphasize the relevance and value for target groups more strongly' },
                                ].map((chip, i) => (
                                  <button
                                    key={i}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRegenerateQuestion(item.questionId, stepId, chip.instruction);
                                    }}
                                    disabled={isGenerating}
                                    className="px-2 py-1 text-[10px] bg-white border border-indigo-200 rounded-full hover:bg-indigo-100 hover:border-indigo-400 transition-colors disabled:opacity-50"
                                  >
                                    {chip.emoji} {chip.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderWorkPackage = (step: any) => {
    const isWPStep =
      (pipelineState?.configuration?.actionType === 'KA210' && step.id === 4) ||
      (pipelineState?.configuration?.actionType === 'KA220' && step.id === 6);

    if (!isWPStep || !pipelineState?.workPackages || pipelineState.workPackages.length === 0) return null;

    return (
      <div className="space-y-12 mt-8 border-t pt-8">
        <h3 className="text-xl font-bold text-[#003399] flex items-center gap-2 mb-6">
          <Layers className="h-6 w-6" />
          {pipelineState.configuration?.actionType === 'KA210' ? 'Activities Details' : 'Work Packages Overview'}
        </h3>

        {pipelineState.workPackages.map((wp, idx) => (
          <div key={wp.id || idx} className="bg-slate-50/50 p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="inline-block px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-xs font-bold uppercase mb-2">
                  {pipelineState.configuration?.actionType === 'KA210' ? `Activity ${idx + 1}` : `Work Package ${idx + 1}`}
                </span>
                <h5 className="font-bold text-xl text-slate-900">{wp.title}</h5>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Lead: {wp.lead || 'TBD'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Duration: {typeof wp.duration === 'string' ? wp.duration : `M${wp.duration?.start}-M${wp.duration?.end}`}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecuteStep(step.id);
                }}
                className="text-xs bg-white"
                disabled={isGenerating}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                {t('regenerateSection' as any) || 'Regenerate All'}
              </Button>
            </div>

            {/* Specific Questions Section */}
            {wp.specificQuestions && wp.specificQuestions.length > 0 && (
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <h6 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Specific Objectives & Details
                </h6>
                <div className="space-y-4">
                  {wp.specificQuestions.map((qa, i) => (
                    <div key={i} className="bg-white p-3 rounded border border-indigo-100 shadow-sm">
                      <div className="text-xs font-bold text-indigo-700 mb-1 uppercase tracking-wider">
                        {qa.question}
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {qa.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wp.objectives.length > 0 && !wp.specificQuestions && (
              <div>
                <strong className="block mb-1">Objectives:</strong>
                <ul className="list-disc ml-4 text-sm">
                  {wp.objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}
                </ul>
              </div>
            )}

            {wp.indicators && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-2 rounded">
                  <strong className="block mb-1 text-blue-800">Quantitative Indikatoren:</strong>
                  <ul className="list-disc ml-4 text-sm text-blue-900">
                    {wp.indicators.quantitative && wp.indicators.quantitative.length > 0 ? (
                      wp.indicators.quantitative.map((ind: string, i: number) => <li key={i}>{ind}</li>)
                    ) : (
                      <li className="list-none text-gray-400 italic">Keine quantitativen Indikatoren</li>
                    )}
                  </ul>
                </div>
                <div className="bg-purple-50 p-2 rounded">
                  <strong className="block mb-1 text-purple-800">Qualitative Indikatoren:</strong>
                  <ul className="list-disc ml-4 text-sm text-purple-900">
                    {wp.indicators.qualitative && wp.indicators.qualitative.length > 0 ? (
                      wp.indicators.qualitative.map((ind: string, i: number) => <li key={i}>{ind}</li>)
                    ) : (
                      <li className="list-none text-gray-400 italic">Keine qualitativen Indikatoren</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {wp.activities?.length > 0 && (
              <div>
                <strong className="block mb-2 text-lg">Activities:</strong>
                <div className="space-y-4">
                  {wp.activities.map((a: any, i: number) => (
                    <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold text-base text-gray-900">{a.id || `A${i + 1}`}: {a.title}</div>
                          <div className="text-xs text-gray-500">
                            {a.responsible} · M{a.month?.start}-M{a.month?.end}
                            {a.participatingPartners && ` · With: ${a.participatingPartners.join(', ')}`}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegenerateActivity(wp.number, i + 1);
                          }}
                          className="ml-2 text-xs flex-shrink-0"
                          disabled={generatingActivityId === (a.id || `wp${wp.number}-act${i + 1}`) || isGenerating}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${generatingActivityId === (a.id || `wp${wp.number}-act${i + 1}`) ? 'animate-spin' : ''}`} />
                          {language === 'de' ? 'Regenerieren' : 'Regenerate'}
                        </Button>
                      </div>

                      {/* Detailed Activity Description */}
                      {a.content && (
                        <div className="grid gap-3 mt-3 text-sm">
                          <div>
                            <span className="font-semibold text-gray-700">Content:</span>
                            <p className="text-gray-600 mt-0.5">{a.content}</p>
                          </div>
                          {a.objectivesAlignment && (
                            <div>
                              <span className="font-semibold text-gray-700">Objectives Alignment:</span>
                              <p className="text-gray-600 mt-0.5">{a.objectivesAlignment}</p>
                            </div>
                          )}
                          {a.expectedResults && (
                            <div>
                              <span className="font-semibold text-gray-700">Expected Results:</span>
                              <p className="text-gray-600 mt-0.5">{a.expectedResults}</p>
                            </div>
                          )}
                          {a.participants && (
                            <div>
                              <span className="font-semibold text-gray-700">Participants:</span>
                              <p className="text-gray-600 mt-0.5">{a.participants}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {!a.content && <p className="text-sm mt-2">{a.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wp.deliverables?.length > 0 && (
              <div>
                <strong className="block mb-1">Deliverables:</strong>
                <ul className="list-disc ml-4 text-sm">
                  {wp.deliverables.map((d: any, i: number) => (
                    <li key={i}>
                      <strong>{d.id}:</strong> {d.title} (M{d.dueMonth}) -
                      <span className="italic text-gray-600"> {d.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {wp.budgetRationale && (
              <div className="bg-green-50 p-3 rounded border border-green-200 mt-4">
                <strong className="block mb-1 text-green-800">Budget & Kosteneffizienz:</strong>
                <p className="text-sm text-green-900">{wp.budgetRationale}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ============================================================================
  const renderMethodology = (step: any) => {
    const wpCount = pipelineState.configuration?.wpCount || 5;
    const methodologyStepId = wpCount + 4;

    if (step.id !== methodologyStepId || !pipelineState.methodology) return null;

    const m = pipelineState.methodology;
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <h5 className="font-bold text-lg">Methodology & QA</h5>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleExecuteStep(step.id);
            }}
            className="ml-2 text-xs"
            disabled={isGenerating}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>

        {m.approach && (
          <div>
            <strong className="block mb-1">Approach:</strong>
            <p className="text-sm text-gray-700">{m.approach}</p>
          </div>
        )}

        {m.innovativeElements && (
          <div className="bg-purple-50 p-3 rounded border border-purple-100">
            <strong className="block mb-1 text-purple-800">Innovative Elements:</strong>
            <ul className="list-disc ml-4 text-sm text-purple-900">
              {m.innovativeElements.map((el, i) => <li key={i}>{el}</li>)}
            </ul>
          </div>
        )}

        {m.qualityAssurance && (
          <div className="bg-blue-50 p-3 rounded border border-blue-100">
            <strong className="block mb-1 text-blue-800">Quality Assurance:</strong>
            <p className="text-sm text-blue-900">{m.qualityAssurance}</p>
          </div>
        )}

        {m.riskManagement && (
          <div>
            <strong className="block mb-1">Risk Management:</strong>
            <div className="space-y-2">
              {m.riskManagement.map((risk, i) => (
                <div key={i} className="text-sm border-l-2 border-red-300 pl-2 bg-red-50 p-2 rounded-r">
                  <div className="font-semibold text-red-800">{risk.risk} <span className="text-xs font-normal text-gray-500">({risk.probability})</span></div>
                  <div className="text-gray-700">{risk.mitigation}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderImpact = (step: any) => {
    const wpCount = pipelineState.configuration?.wpCount || 5;
    const impactStepId = wpCount + 5;

    if (step.id !== impactStepId || !pipelineState.impact) return null;

    const imp = pipelineState.impact;
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <h5 className="font-bold text-lg">Impact & Sustainability</h5>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleExecuteStep(step.id);
            }}
            className="ml-2 text-xs"
            disabled={isGenerating}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>

        {imp.expectedImpact && (
          <div className="bg-green-50 p-3 rounded border border-green-100">
            <strong className="block mb-1 text-green-800">Expected Impact:</strong>
            <p className="text-sm text-green-900">{imp.expectedImpact}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {imp.quantitativeIndicators && (
            <div>
              <strong className="block mb-1">Quantitative Indicators:</strong>
              <ul className="list-disc ml-4 text-sm">
                {imp.quantitativeIndicators.map((ind, i) => (
                  <li key={i}>
                    <span className="font-medium">{ind.indicator}:</span> {ind.target}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {imp.qualitativeIndicators && (
            <div>
              <strong className="block mb-1">Qualitative Indicators:</strong>
              <ul className="list-disc ml-4 text-sm">
                {imp.qualitativeIndicators.map((ind, i) => <li key={i}>{ind}</li>)}
              </ul>
            </div>
          )}
        </div>

        {imp.targetGroupBenefits && (
          <div>
            <strong className="block mb-1">Benefits per Target Group:</strong>
            <div className="space-y-2">
              {imp.targetGroupBenefits.map((b, i) => (
                <div key={i} className="text-sm bg-gray-50 p-2 rounded border">
                  <div className="font-semibold">{b.group}</div>
                  <ul className="list-disc ml-4 text-gray-600">
                    {b.benefits.map((ben, j) => <li key={j}>{ben}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {pipelineState.sustainability && (
          <div className="bg-yellow-50 p-3 rounded border border-yellow-100 mt-4">
            <strong className="block mb-1 text-yellow-800">Sustainability Strategy:</strong>
            <p className="text-sm text-yellow-900">{pipelineState.sustainability.strategy}</p>
          </div>
        )}
      </div>
    );
  };

  const renderBudget = (step: any) => {
    const wpCount = pipelineState.configuration?.wpCount || 5;
    const budgetStepId = wpCount + 6;

    if (step.id !== budgetStepId || !pipelineState.budget) return null;

    const b = pipelineState.budget;
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <h5 className="font-bold text-lg">Budget & Timeline</h5>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleExecuteStep(step.id);
            }}
            className="ml-2 text-xs"
            disabled={isGenerating}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <div className="text-sm text-blue-600 mb-1">Total Budget</div>
            <div className="text-2xl font-bold text-blue-900">€{b.totalBudget?.toLocaleString()}</div>
          </div>
          {pipelineState.timeline && (
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
              <div className="text-sm text-purple-600 mb-1">Duration</div>
              <div className="text-2xl font-bold text-purple-900">{pipelineState.timeline.totalMonths} Months</div>
            </div>
          )}
        </div>

        {b.perPartner && (
          <div>
            <strong className="block mb-2">Budget Distribution (Partner):</strong>
            <div className="space-y-2">
              {b.perPartner.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                  <span>{p.partner}</span>
                  <span className="font-mono font-medium">€{p.amount?.toLocaleString()} ({p.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {b.categories && (
          <div>
            <strong className="block mb-2">Cost Categories:</strong>
            <div className="space-y-2">
              {b.categories.map((c, i) => (
                <div key={i} className="flex justify-between items-center text-sm p-2 border-b last:border-0 border-gray-100">
                  <span>{c.category}</span>
                  <span className="font-mono text-gray-600">€{c.amount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSummary = (step: any) => {
    const wpCount = pipelineState.configuration?.wpCount || 5;
    const summaryStepId = wpCount + 7;

    if (step.id !== summaryStepId) return null;

    return (
      <div className="space-y-4">
        <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-green-900 mb-2">Project Generation Complete</h3>
          <p className="text-green-800 mb-4">
            Your project proposal has been fully generated and evaluated.
          </p>
        </div>

        <div className="flex justify-between items-start">
          <h5 className="font-bold text-lg">Executive Summary</h5>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleExecuteStep(step.id);
            }}
            className="ml-2 text-xs"
            disabled={isGenerating}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
            Regenerate Summary
          </Button>
        </div>

        {pipelineState.executiveSummary ? (
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm leading-relaxed text-gray-800">
            {pipelineState.executiveSummary.split('\n').map((para, i) => (
              <p key={i} className="mb-2 last:mb-0">{para}</p>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            No summary generated yet. Click Regenerate to create it.
          </div>
        )}
      </div>
    );
  };

  // RENDER PIPELINE EXECUTION
  // ============================================================================

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header with Project Info */}
      <div className="bg-gradient-to-r from-[#003399] to-[#0055cc] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-yellow-400" />
              <span className="text-blue-200 text-sm">
                {t('aiGenerating')}
              </span>
            </div>
            <h1 className="text-2xl font-bold truncate max-w-2xl">
              {pipelineState.acronym || (pipelineState.projectTitle && pipelineState.projectTitle.length > 80
                ? pipelineState.projectTitle.substring(0, 80) + '...'
                : pipelineState.projectTitle) || t('creatingApplication')}
            </h1>
            {pipelineState.projectTitle && pipelineState.acronym && (
              <p className="text-blue-200 text-sm mt-1 truncate max-w-lg">
                {pipelineState.projectTitle}
              </p>
            )}

            {/* Key Project Metrics (Duration, Budget, Partners) */}
            <div className="flex items-center gap-4 mt-4 text-sm font-medium">
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-white shadow-sm border border-white/5">
                <Users className="h-4 w-4 text-blue-200" />
                {pipelineState.consortium?.length || 0} {language === 'de' ? 'Partner' : 'Partners'}
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-white shadow-sm border border-white/5">
                <Calendar className="h-4 w-4 text-blue-200" />
                {pipelineState.configuration?.duration || (pipelineState.configuration?.actionType === 'KA210' ? 12 : 24)} {language === 'de' ? 'Monate' : 'Months'}
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-white shadow-sm border border-white/5">
                <span className="text-blue-200 font-bold">€</span>
                {(pipelineState.configuration?.totalBudget || (pipelineState.configuration?.actionType === 'KA220' ? 250000 : 60000)).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div className="text-4xl font-bold">
              {pipelineState.currentStep} / {PIPELINE_STEPS.length}
            </div>
            <div className="text-blue-200 text-sm">
              {t('stepsCompleted')}
            </div>

            {/* Save Project Button - Prominent Green */}
            <div className="flex items-center gap-3 mt-2">
              {currentProjectId && (
                <span className="text-xs text-blue-200">
                  📁 {projects.find(p => p.id === currentProjectId)?.title || 'Projekt'}
                </span>
              )}
              <Button
                size="sm"
                className={`${projectSaved
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'} font-medium shadow-lg`}
                onClick={() => saveGeneratorStateToProject()}
              >
                {projectSaved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    {language === 'de' ? 'Gespeichert ✓' : 'Saved ✓'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1.5" />
                    {language === 'de' ? '💾 Speichern' : '💾 Save'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-green-400 transition-all duration-500"
            style={{ width: `${(pipelineState.currentStep / PIPELINE_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Auto-Run Progress Banner */}
      {isAutoRunning && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              <div>
                <p className="font-semibold text-blue-900">
                  {language === 'de' ? 'Vollautomatische Generierung' : 'Full Auto-Generation'}
                </p>
                <p className="text-sm text-blue-700">{currentStatus}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <Timer className="h-3.5 w-3.5" />
                <span>
                  {Math.round((Date.now() - autoRunStartTimeRef.current) / 60000)} Min.
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { autoRunCancelledRef.current = true; }}
              >
                <Square className="h-4 w-4 mr-1" />
                {language === 'de' ? 'Stoppen' : 'Stop'}
              </Button>
            </div>
          </div>
          {/* Step progress bar */}
          <div className="flex items-center gap-1">
            {Array.from({ length: PIPELINE_STEPS.length }, (_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${
                i + 1 < (pipelineState?.currentStep || 0) ? 'bg-emerald-500' :
                i + 1 === (pipelineState?.currentStep || 0) ? 'bg-blue-500 animate-pulse' :
                'bg-gray-200'
              }`} />
            ))}
          </div>
          <div className="flex justify-between text-xs text-blue-600 mt-1">
            <span>{language === 'de' ? 'Schritt' : 'Step'} {pipelineState.currentStep}/{PIPELINE_STEPS.length}</span>
            <span>{Math.round((pipelineState.currentStep / PIPELINE_STEPS.length) * 100)}%</span>
          </div>
        </div>
      )}

      {/* Current Status (non auto-run) */}
      {isGenerating && !isAutoRunning && currentStatus && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-[#003399]">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="font-medium">{currentStatus}</span>
        </div>
      )}

      {/* Main Action Bar */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Full Auto-Run Button */}
          {!isGenerating && !isAutoRunning && pipelineState.currentStep < PIPELINE_STEPS.length && (
            <Button
              onClick={handleExecuteAll}
              size="lg"
              className="bg-gradient-to-r from-[#003399] to-[#0055cc] hover:from-[#002266] hover:to-[#004499] text-white shadow-lg"
            >
              <Zap className="h-5 w-5 mr-2" />
              {pipelineState.currentStep === 0
                ? (language === 'de' ? '⚡ Alles generieren' : '⚡ Generate All')
                : (language === 'de' ? '⚡ Restliche Schritte generieren' : '⚡ Generate Remaining')}
            </Button>
          )}

          {/* Next Step Button (manual single-step) */}
          {pipelineState.currentStep < PIPELINE_STEPS.length && !isGenerating && !isAutoRunning && (
            <Button
              onClick={() => handleExecuteStep(pipelineState.currentStep + 1)}
              variant="outline"
              className="border-[#003399] text-[#003399] hover:bg-blue-50"
            >
              <Play className="h-4 w-4 mr-2" />
              {language === 'de'
                ? `Nächster Schritt (${pipelineState.currentStep + 1})`
                : `Next Step (${pipelineState.currentStep + 1})`}
            </Button>
          )}

          {/* Generating indicator (non auto-run) */}
          {isGenerating && !isAutoRunning && (
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-lg text-[#003399]">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="font-medium">{currentStatus || 'Generiert...'}</span>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Evaluate Proposal Button */}
          {pipelineState.currentStep >= 5 && (
            <Button
              onClick={() => {
                // Scroll to the evaluator section at the bottom
                const evaluatorEl = document.getElementById('proposal-evaluator-section');
                if (evaluatorEl) {
                  evaluatorEl.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow"
            >
              <Search className="h-4 w-4 mr-2" />
              {language === 'de' ? 'Antrag prüfen (Gutachter)' : 'Evaluate Proposal'}
            </Button>
          )}

          {/* Save button - always visible */}
          <Button
            onClick={() => saveGeneratorStateToProject()}
            className={`${projectSaved
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-green-600 hover:bg-green-700'} text-white shadow`}
          >
            {projectSaved ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {language === 'de' ? 'Gespeichert ✓' : 'Saved ✓'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {language === 'de' ? '💾 Speichern' : '💾 Save'}
              </>
            )}
          </Button>
        </div>

        {/* Progress info */}
        <div className="mt-3 pt-3 border-t text-sm text-gray-500 flex items-center gap-4">
          <span>
            {language === 'de'
              ? `Fortschritt: ${pipelineState.currentStep} von ${PIPELINE_STEPS.length} Schritten`
              : `Progress: ${pipelineState.currentStep} of ${PIPELINE_STEPS.length} steps`}
          </span>
          {pipelineState.answers && Object.keys(pipelineState.answers).length > 0 && (
            <span className="text-green-600">
              ✓ {Object.values(pipelineState.answers).filter((a: any) => a?.value).length} {language === 'de' ? 'Antworten generiert' : 'answers generated'}
            </span>
          )}
        </div>

        {/* Quick Post-It Notes - Miniature view in Hero Section */}
        {projectKnowledgePool.notes && projectKnowledgePool.notes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  {language === 'de' ? 'Projekt-Notizen' : 'Project Notes'}
                </span>
                <Badge className="bg-yellow-500 text-white text-xs">{projectKnowledgePool.notes.length}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Scroll to knowledge pool and open notes tab
                  const knowledgePoolEl = document.querySelector('[data-knowledge-pool]');
                  if (knowledgePoolEl) {
                    knowledgePoolEl.scrollIntoView({ behavior: 'smooth' });
                  }
                  setEditingNoteId('new');
                }}
                className="text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100 h-7 px-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span className="text-xs">{language === 'de' ? 'Neue Notiz' : 'New Note'}</span>
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {projectKnowledgePool.notes.slice(0, 6).map((note) => (
                <div
                  key={note.id}
                  className={`relative group bg-yellow-100 border-2 rounded-lg shadow-sm hover:shadow-lg transition-all cursor-pointer ${expandedNoteId === note.id
                    ? 'border-yellow-500 w-full max-w-none p-4'
                    : 'border-yellow-300 px-3 py-2 max-w-[200px] hover:border-yellow-400'
                    }`}
                  onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                >
                  {/* Edit Button - visible on hover or when expanded */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNoteId(note.id);
                      // Scroll to knowledge pool
                      const knowledgePoolEl = document.querySelector('[data-knowledge-pool]');
                      if (knowledgePoolEl) {
                        knowledgePoolEl.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className={`absolute top-1 right-1 p-1.5 rounded-full bg-yellow-200 hover:bg-yellow-300 text-yellow-700 hover:text-yellow-900 transition-all ${expandedNoteId === note.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    title={language === 'de' ? 'Bearbeiten' : 'Edit'}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  {/* Expand/Collapse indicator */}
                  <div className={`absolute bottom-1 right-1 text-yellow-500 ${expandedNoteId === note.id ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    {expandedNoteId === note.id ? (
                      <Minimize2 className="h-3 w-3" />
                    ) : (
                      <Maximize2 className="h-3 w-3" />
                    )}
                  </div>

                  {/* Content */}
                  {expandedNoteId === note.id ? (
                    <div className="pr-8">
                      <p className="text-sm font-semibold text-yellow-900 mb-2">{note.title}</p>
                      <p className="text-sm text-yellow-800 whitespace-pre-wrap">{note.content}</p>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {note.tags.map((tag, idx) => (
                            <span key={idx} className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-yellow-900 truncate pr-6">{note.title}</p>
                      <p className="text-[10px] text-yellow-700 line-clamp-2 mt-0.5">{note.content}</p>
                    </>
                  )}
                </div>
              ))}
              {projectKnowledgePool.notes.length > 6 && (
                <div
                  className="bg-yellow-200 border-2 border-yellow-400 rounded-lg px-3 py-2 flex items-center justify-center text-xs text-yellow-800 font-medium cursor-pointer hover:bg-yellow-300 transition-colors"
                  onClick={() => {
                    const knowledgePoolEl = document.querySelector('[data-knowledge-pool]');
                    if (knowledgePoolEl) {
                      knowledgePoolEl.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  +{projectKnowledgePool.notes.length - 6} {language === 'de' ? 'mehr' : 'more'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Project Knowledge Pool - Prominent at top */}
      <div
        data-knowledge-pool
        className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 rounded-xl border-2 border-amber-300 shadow-lg overflow-hidden"
      >
        <ProjectKnowledgePool
          knowledgePool={projectKnowledgePool}
          onUpdate={(pool) => {
            console.log('[Generator] Knowledge pool update:', pool.documents?.length, 'docs,', pool.notes?.length, 'notes');
            console.log('[Generator] Pool doc IDs:', pool.documents?.map(d => `${d.id}:${d.status}`));
            // Use the pool directly without merging - the child component handles all state
            setProjectKnowledgePool({
              documents: pool.documents || [],
              websites: pool.websites || [],
              notes: pool.notes || [],
            });
            setProjectSaved(false); // Mark as unsaved when knowledge changes
          }}
          onSaveToProject={() => {
            // Save the entire project including knowledge pool
            saveGeneratorStateToProject();
            console.log('[Generator] Knowledge pool saved to project');
          }}
          language={language}
          compact={false}
          initialEditingNoteId={editingNoteId}
          onEditingNoteChange={setEditingNoteId}
        />
      </div>

      {/* Pipeline Steps */}
      <div className="space-y-3">
        {(pipelineState ? getPipelineSteps(pipelineState.configuration?.wpCount || 5) : PIPELINE_STEPS).map((step) => {
          const isCompleted = pipelineState.currentStep >= step.id;
          const isCurrent = pipelineState.currentStep + 1 === step.id;
          const evaluation = pipelineState.evaluatorFeedback?.find((e) => e.step === step.id);
          const isExpanded = expandedStep === step.id;

          return (
            <Card
              key={step.id}
              className={`transition-all ${isCurrent ? 'ring-2 ring-[#003399] shadow-lg' : ''
                } ${isCompleted ? 'border-green-200 bg-green-50/50' : ''}`}
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                    ) : isCurrent ? (
                      <div className="h-8 w-8 rounded-full bg-[#003399] flex items-center justify-center animate-pulse">
                        <Play className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm text-gray-500 font-bold">
                        {step.id}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{step.name}</div>
                      <div className="text-sm text-gray-500">{step.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* WP indicator for step 6 - click to expand and see individual WP buttons */}
                    {step.id === 6 && !isCompleted && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                        {language === 'de' ? '→ Klicken für WP-Buttons' : '→ Click for WP buttons'}
                      </span>
                    )}
                    {/* Step 8 (Final Evaluation) special indicator */}
                    {step.id === 8 && !isCompleted && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        {language === 'de' ? '🔍 Qualitätsprüfung' : '🔍 Quality Check'}
                      </span>
                    )}
                    {/* Execute Button for this step - visible without expanding */}
                    {/* HIDE for Step 6 (WPs) - individual WP buttons are shown when expanded */}
                    {!isGenerating && step.id !== 6 && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExecuteStep(step.id);
                        }}
                        className={`${isCompleted
                          ? 'bg-green-600 hover:bg-green-700'
                          : step.id === 8
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'bg-[#003399] hover:bg-[#002266]'
                          } text-white`}
                      >
                        {step.id === 8 ? (
                          <Search className="h-3 w-3 mr-1" />
                        ) : isCompleted ? (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        ) : (
                          <Play className="h-3 w-3 mr-1" />
                        )}
                        {isCompleted
                          ? step.id === 8
                            ? (language === 'de' ? 'Erneut prüfen' : 'Re-check')
                            : (language === 'de' ? 'Neu generieren' : 'Regenerate')
                          : step.id === 8
                            ? (language === 'de' ? 'Evaluieren' : 'Evaluate')
                            : (language === 'de' ? 'Ausführen' : 'Execute')}
                      </Button>
                    )}
                    {isGenerating && expandedStep === step.id && (
                      <div className="flex items-center gap-2 text-[#003399]">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Generiert...</span>
                      </div>
                    )}
                    {/* Score badge removed per user request */}
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content - Always available when expanded */}
              {isExpanded && (
                <CardContent className="pt-0 border-t">
                  {/* STEP 6 SPECIAL: Always show individual WP Generation Buttons */}
                  {step.id === 6 && (
                    <div className="mt-4 space-y-4">
                      <div className="space-y-3">
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 mb-4">
                          <p className="text-sm text-orange-800 font-medium">
                            {language === 'de'
                              ? '⚠️ Arbeitspakete müssen einzeln generiert werden, um API-Timeouts zu vermeiden.'
                              : '⚠️ Work packages must be generated individually to avoid API timeouts.'}
                          </p>
                        </div>
                        {Array.from({ length: wpCount }, (_, i) => i + 1).map((wpNum) => {
                          const existingWP = pipelineState.workPackages?.find(wp => wp.number === wpNum);
                          const wpTitle = wpNum === 1 ? 'Project Management' :
                            wpNum === wpCount ? 'Dissemination & Exploitation' :
                              `Implementation Phase ${wpNum - 1}`;
                          const isThisWPGenerating = generatingWPNumber === wpNum;
                          return (
                            <div
                              key={wpNum}
                              className={`flex items-center justify-between p-4 rounded-lg border ${existingWP
                                ? 'bg-green-50 border-green-200'
                                : isThisWPGenerating
                                  ? 'bg-blue-50 border-blue-300'
                                  : 'bg-orange-50 border-orange-200'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                {existingWP ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : isThisWPGenerating ? (
                                  <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                                ) : (
                                  <div className="h-5 w-5 rounded-full border-2 border-orange-400 flex items-center justify-center text-xs text-orange-600 font-bold">
                                    {wpNum}
                                  </div>
                                )}
                                <div>
                                  <p className={`font-medium ${existingWP ? 'text-green-800' : isThisWPGenerating ? 'text-blue-800' : 'text-orange-800'}`}>
                                    WP{wpNum}: {wpTitle}
                                  </p>
                                  {existingWP && (
                                    <p className="text-xs text-green-600">
                                      {language === 'de' ? '✓ Generiert' : '✓ Generated'}
                                    </p>
                                  )}
                                  {isThisWPGenerating && (
                                    <p className="text-xs text-blue-600">
                                      {language === 'de' ? 'Wird generiert...' : 'Generating...'}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  // Prevent multiple clicks
                                  if (generatingWPNumber !== null) return;
                                  // Set which WP is being generated
                                  setGeneratingWPNumber(wpNum);
                                  try {
                                    await handleExecuteStep(6, wpNum - 1);
                                  } finally {
                                    setGeneratingWPNumber(null);
                                  }
                                }}
                                disabled={generatingWPNumber !== null}
                                className={existingWP
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : isThisWPGenerating
                                    ? 'bg-blue-500 text-white cursor-wait'
                                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                                }
                              >
                                {isThisWPGenerating ? (
                                  <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <Play className="h-4 w-4 mr-1" />
                                )}
                                {isThisWPGenerating
                                  ? (language === 'de' ? 'Läuft...' : 'Running...')
                                  : existingWP
                                    ? (language === 'de' ? 'Neu generieren' : 'Regenerate')
                                    : (language === 'de' ? 'Generieren' : 'Generate')}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Other steps: Not yet generated - show generation options */}
                  {!isCompleted && step.id !== 6 && (
                    <div className="mt-4 space-y-4">
                      {/* Show questions that can be answered manually or generated */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-700">
                          <FileText className="h-4 w-4" />
                          {language === 'de' ? 'Fragen für diesen Schritt' : 'Questions for this step'}
                        </h4>
                        {renderQuestionsForStep(step.id)}
                      </div>

                      {/* Generate button for this step */}
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div>
                          <p className="font-medium text-blue-800">
                            {language === 'de' ? 'KI-Generierung' : 'AI Generation'}
                          </p>
                          <p className="text-sm text-blue-600">
                            {language === 'de'
                              ? 'Lass die KI diesen Abschnitt automatisch erstellen'
                              : 'Let AI automatically generate this section'}
                          </p>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExecuteStep(step.id);
                          }}
                          disabled={isGenerating}
                          className="bg-[#003399] hover:bg-[#002266]"
                        >
                          {isGenerating ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          {language === 'de' ? 'Generieren' : 'Generate'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Already generated - show content and edit options */}
                  {isCompleted && (
                    <>
                      {/* Generated Content Preview */}
                      {/* Preview Mode Rendering */}
                      {previewContent[step.id] ? (
                        <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
                          <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-indigo-600" />
                            {language === 'de' ? 'Vorschau der Verbesserung' : 'Improvement Preview'}
                          </h4>
                          <div className="text-sm text-gray-800 mb-4 bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                            {/* Smart preview rendering based on content type */}
                            {(() => {
                              const content = previewContent[step.id];
                              // Render content based on structure
                              const renderValue = (value: any, depth = 0): React.ReactNode => {
                                if (typeof value === 'string') {
                                  // Format markdown-like content
                                  return (
                                    <div className="prose prose-sm max-w-none">
                                      {formatMarkdownToReact(value)}
                                    </div>
                                  );
                                }
                                if (Array.isArray(value)) {
                                  return (
                                    <ul className="list-disc pl-4 space-y-1">
                                      {value.map((item, i) => (
                                        <li key={i}>{typeof item === 'string' ? item : renderValue(item, depth + 1)}</li>
                                      ))}
                                    </ul>
                                  );
                                }
                                if (typeof value === 'object' && value !== null) {
                                  return (
                                    <div className={depth > 0 ? 'pl-3 border-l-2 border-indigo-100 ml-2' : 'space-y-3'}>
                                      {Object.entries(value).map(([key, val]) => (
                                        <div key={key} className="mb-2">
                                          <h5 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                                          </h5>
                                          <div className="text-gray-700">{renderValue(val, depth + 1)}</div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return <span>{String(value)}</span>;
                              };
                              return renderValue(content);
                            })()}
                          </div>
                          <div className="flex justify-end gap-3 pt-2 border-t border-indigo-100">
                            <Button
                              variant="outline"
                              className="bg-white hover:bg-rose-50 text-rose-600 border-rose-200"
                              onClick={() => setPreviewContent(prev => {
                                const next = { ...prev };
                                delete next[step.id];
                                return next;
                              })}
                            >
                              <X className="h-4 w-4 mr-1" />
                              {language === 'de' ? 'Verwerfen' : 'Discard'}
                            </Button>
                            <Button
                              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                              onClick={() => {
                                // Apply the preview content to pipeline state
                                const newState = { ...pipelineState };
                                const content = previewContent[step.id];

                                const wpCount = pipelineState.configuration?.wpCount || 5;
                                const wpStart = 4;
                                const wpEnd = wpStart + wpCount - 1;

                                if (step.id === 1) {
                                  if (content.projectTitle) newState.projectTitle = content.projectTitle;
                                  if (content.acronym) newState.acronym = content.acronym;
                                } else if (step.id === 2) {
                                  newState.needsAnalysis = content;
                                } else if (step.id === 3) {
                                  newState.objectives = content;
                                } else if (step.id >= wpStart && step.id <= wpEnd) {
                                  if (newState.workPackages) {
                                    newState.workPackages[step.id - 4] = content;
                                  }
                                } else if (step.id === wpEnd + 1) {
                                  newState.methodology = content;
                                } else if (step.id === wpEnd + 2) {
                                  newState.impact = content.impact;
                                  newState.sustainability = content.sustainability;
                                } else if (step.id === wpEnd + 3) {
                                  newState.budget = content.budget;
                                  newState.timeline = content.timeline;
                                } else if (step.id === wpEnd + 4) {
                                  newState.executiveSummary = content.executiveSummary;
                                }

                                setPipelineState(newState);
                                setPreviewContent(prev => {
                                  const next = { ...prev };
                                  delete next[step.id];
                                  return next;
                                });
                              }}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              {language === 'de' ? 'Behalten & Speichern' : 'Keep & Save'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 p-4 bg-white rounded-lg border">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b pb-3">
                            <h4 className="font-medium flex items-center gap-2">
                              <FileText className="h-4 w-4 text-[#003399]" />
                              {language === 'de' ? 'Generierter Inhalt' : 'Generated Content'}
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (step.id === 2) {
                                  handleExecuteStep2AllPartners();
                                } else {
                                  handleExecuteStep(step.id);
                                }
                              }}
                              disabled={isGenerating}
                              className="text-[#003399] border-[#003399]/30 hover:bg-[#003399]/5 shrink-0"
                            >
                              {isGenerating && expandedStep === step.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                              {language === 'de' ? 'Kapitel neu generieren' : 'Regenerate Chapter'}
                            </Button>
                          </div>

                          {/* NEW: Render official questions with answers */}
                          <div className="text-sm text-gray-700">
                            {renderQuestionsForStep(step.id)}
                            {/* Fallback specific renderers for complex steps */}
                            {step.id === 1 && (
                              <div>
                                <p><strong>Title:</strong> {pipelineState.projectTitle}</p>
                                <p><strong>Acronym:</strong> {pipelineState.acronym}</p>
                              </div>
                            )}
                            {step.id === 2 && pipelineState.needsAnalysis && (
                              <div>
                                <p><strong>Problem:</strong> {pipelineState.needsAnalysis.problemStatement}</p>
                              </div>
                            )}
                            {/* Render helper functions for specific steps */}
                            {renderWorkPackage({ id: step.id })}
                            {renderMethodology({ id: step.id })}
                            {renderImpact({ id: step.id })}
                            {renderBudget({ id: step.id })}
                            {renderSummary({ id: step.id })}
                          </div>
                        </div>
                      )}

                      {/* Manual Regeneration Buttons for other sections */}
                      {(step.id === 1 || step.id === 2 || step.id === 3 || step.id > (pipelineState.configuration?.wpCount || 5) + 3) && (
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExecuteStep(step.id);
                            }}
                            className="text-xs text-gray-500 hover:text-gray-900"
                            disabled={isGenerating}
                          >
                            <RefreshCw className={`h-3 w-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                            {t('regenerateSection' as any) || 'Abschnitt neu generieren'}
                          </Button>
                        </div>
                      )}

                      {/* Modern AI Assistant Section */}
                      <div className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold flex items-center gap-2 text-slate-800">
                            <Wand2 className="h-5 w-5 text-indigo-600" />
                            {language === 'de' ? 'KI-Assistent' : 'AI Assistant'}
                          </h4>
                        </div>

                        {/* Instruction Input */}
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              value={editInstruction}
                              onChange={(e) => setEditInstruction(e.target.value)}
                              placeholder={language === 'de'
                                ? 'z.B. "Mehr Statistiken", "Kürzer formulieren", "Zielgruppe deutlicher betonen"...'
                                : 'e.g. "Add statistics", "Make it shorter", "Emphasize target groups"...'}
                              className="flex-1 bg-white"
                            />
                            <Button
                              onClick={() => handleImproveSection(step.id, evaluation, editInstruction)}
                              disabled={isImproving || !editInstruction.trim()}
                              className="bg-indigo-600 hover:bg-indigo-700"
                            >
                              {isImproving && editingStep === step.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Wand2 className="h-4 w-4 mr-1" />
                                  {language === 'de' ? 'Verbessern' : 'Improve'}
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Quick Action Chips */}
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: language === 'de' ? '📊 Statistiken' : '📊 Statistics', instruction: language === 'de' ? 'Füge relevante Statistiken und Daten hinzu' : 'Add relevant statistics and data' },
                              { label: language === 'de' ? '✂️ Kürzen' : '✂️ Shorter', instruction: language === 'de' ? 'Formuliere kürzer und prägnanter' : 'Make it shorter and more concise' },
                              { label: language === 'de' ? '🎯 Zielgruppe' : '🎯 Target Groups', instruction: language === 'de' ? 'Betone die Relevanz für die Zielgruppen stärker' : 'Emphasize relevance for target groups' },
                              { label: language === 'de' ? '🇪🇺 EU-Prioritäten' : '🇪🇺 EU Priorities', instruction: language === 'de' ? 'Verknüpfe stärker mit EU-Prioritäten und Erasmus+ Zielen' : 'Link stronger to EU priorities and Erasmus+ goals' },
                              { label: language === 'de' ? '💡 Innovation' : '💡 Innovation', instruction: language === 'de' ? 'Hebe die innovativen Aspekte hervor' : 'Highlight innovative aspects' },
                            ].map((chip, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setEditInstruction(chip.instruction);
                                  handleImproveSection(step.id, evaluation, chip.instruction);
                                }}
                                disabled={isImproving}
                                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-full hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors disabled:opacity-50"
                              >
                                {chip.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Evaluator Feedback - Collapsed by Default */}
                        {evaluation && (
                          <div className="mt-4">
                            <button
                              onClick={() => setExpandedSections(prev => ({
                                ...prev,
                                [`eval_${step.id}`]: !prev[`eval_${step.id}`]
                              }))}
                              className="flex items-center justify-between w-full px-3 py-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${evaluation.score >= 8 ? 'bg-emerald-500' :
                                  evaluation.score >= 6 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}>
                                  {evaluation.score}
                                </div>
                                <span className="text-sm font-medium text-slate-700">
                                  {language === 'de' ? 'Evaluator-Analyse' : 'Evaluator Analysis'}
                                </span>
                                <span className="text-xs text-slate-500">
                                  ({evaluation.strengths.length} {language === 'de' ? 'Stärken' : 'strengths'}, {evaluation.weaknesses.length} {language === 'de' ? 'Verbesserungen' : 'improvements'})
                                </span>
                              </div>
                              {expandedSections[`eval_${step.id}`] ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              )}
                            </button>

                            {expandedSections[`eval_${step.id}`] && (
                              <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                                {/* Strengths - Compact */}
                                <div className="px-3 py-2 bg-emerald-50 rounded-lg">
                                  <h5 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                                    {language === 'de' ? 'Stärken' : 'Strengths'}
                                  </h5>
                                  <ul className="text-xs space-y-1 text-emerald-800">
                                    {evaluation.strengths.map((s, i) => (
                                      <li key={i} className="flex items-start gap-1.5">
                                        <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                                        <span>{s}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Improvements with Apply Buttons */}
                                {evaluation.weaknesses.length > 0 && (
                                  <div className="space-y-2">
                                    <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wide px-1">
                                      {language === 'de' ? 'Verbesserungsvorschläge' : 'Improvement Suggestions'}
                                    </h5>
                                    {evaluation.weaknesses.map((w, i) => {
                                      const suggestion = evaluation.suggestions[i];
                                      return (
                                        <div key={i} className="px-3 py-2 bg-white rounded-lg border border-slate-200">
                                          <div className="text-xs text-slate-600 mb-2">{w}</div>
                                          {suggestion && (
                                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                              <div className="text-xs text-indigo-700 flex-1 italic">
                                                "{suggestion.slice(0, 100)}{suggestion.length > 100 ? '...' : ''}"
                                              </div>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 text-xs text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                                                onClick={() => {
                                                  setEditInstruction(suggestion);
                                                  handleImproveSection(step.id, { ...evaluation, suggestions: [suggestion], weaknesses: [w] }, suggestion);
                                                }}
                                                disabled={isImproving}
                                              >
                                                <ArrowRight className="h-3 w-3 mr-1" />
                                                {language === 'de' ? 'Anwenden' : 'Apply'}
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Critical Issues */}
                                {evaluation.criticalIssues.length > 0 && (
                                  <div className="px-3 py-2 bg-rose-50 rounded-lg border border-rose-200">
                                    <h5 className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2">
                                      ⚠️ {language === 'de' ? 'Kritisch' : 'Critical'}
                                    </h5>
                                    <ul className="text-xs space-y-1 text-rose-800">
                                      {evaluation.criticalIssues.map((c, i) => (
                                        <li key={i} className="flex items-start gap-1.5">
                                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                          <span>{c}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              )
              }
            </Card>
          );
        })}
      </div >

      {/* Proposal Evaluator Section (Shown at the bottom after step 5) */}
      {pipelineState && pipelineState.currentStep >= 5 && (
        <div id="proposal-evaluator-section" className="mt-12 pt-8 border-t-2 border-dashed border-slate-200">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <Search className="h-6 w-6 text-purple-600" />
                {language === 'de' ? 'Gutachter-Prüfung' : 'Evaluator Check'}
              </h3>
              <p className="text-slate-500 mt-1">
                {language === 'de'
                  ? 'Simuliere eine offizielle EU-Evaluierung basierend auf den generierten Texten.'
                  : 'Simulate an official EU evaluation based on the generated texts.'}
              </p>
            </div>
          </div>

          <ProposalEvaluator
            pipelineState={pipelineState}
            language={language}
          />
        </div>
      )}

      {/* Programme Guide Assistant Floating Button */}
      < div className="fixed bottom-6 right-6 z-50" >
        {!showGuideChat ? (
          <Button
            onClick={() => setShowGuideChat(true)}
            className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl flex items-center justify-center transition-transform hover:scale-110"
          >
            <BookOpen className="h-6 w-6 text-white" />
          </Button>
        ) : (
          <Card className="w-80 md:w-96 shadow-2xl border-2 border-blue-100 flex flex-col h-[500px]">
            <div className="p-4 bg-blue-600 text-white rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <span className="font-bold">Erasmus+ Guide</span>
              </div>
              <button onClick={() => setShowGuideChat(false)} className="hover:bg-blue-500 p-1 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {guideMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border text-gray-800 shadow-sm'
                    }`}>
                    {msg.content}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-blue-600">
                        <strong>Sources:</strong>
                        <ul className="list-disc ml-4 mt-1">
                          {msg.sources.map((s, i) => (
                            <li key={i}>{s.documentName} (p. {s.pageNumber})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isGuideThinking && (
                <div className="flex justify-start">
                  <div className="bg-white border rounded-lg p-3 shadow-sm">
                    <div className="animate-pulse flex space-x-2">
                      <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t bg-white">
              <div className="flex items-center gap-2">
                <Input
                  value={guideQuery}
                  onChange={(e) => setGuideQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskGuide()}
                  placeholder={language === 'de' ? 'Frag den Guide...' : 'Ask the Guide...'}
                  className="flex-1"
                />
                <Button onClick={handleAskGuide} size="icon" className="bg-blue-600 hover:bg-blue-700">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
