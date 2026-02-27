"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Star, FileText, BookOpen, Users, Layers, Rocket,
  ChevronLeft, ChevronRight, Save, ArrowRight, RefreshCw,
  Check, CheckCircle2, FolderOpen, Trash2, ArrowRightLeft, Library,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useStarsConceptStore } from '@/store/stars-concept-store';
import { useRouter } from 'next/navigation';

import { StarsStep1Frame } from './steps/StarsStep1Frame';
import { StarsStep2Sources } from './steps/StarsStep2Sources';
import { StarsStep3Partnership } from './steps/StarsStep3Partnership';
import { StarsStep4Core } from './steps/StarsStep4Core';
import { StarsStep5Summary } from './steps/StarsStep5Summary';
import { useStarsGeneration } from '@/hooks/useStarsGeneration';

// ============================================================================
// STEP DEFINITIONS
// ============================================================================

const STEPS = [
  { id: 1, title: 'Projektrahmen', icon: FileText, color: 'blue' },
  { id: 2, title: 'Recherche', icon: BookOpen, color: 'emerald' },
  { id: 3, title: 'Partnerschaft', icon: Users, color: 'purple' },
  { id: 4, title: 'Projektkern', icon: Layers, color: 'indigo' },
  { id: 5, title: 'Expose & Export', icon: Rocket, color: 'amber' },
];

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface StarsExposeDeveloperProps {
  resumeProjectId?: string;
  onSwitchMode?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StarsExposeDeveloper({ resumeProjectId, onSwitchMode }: StarsExposeDeveloperProps) {
  const router = useRouter();

  // App store
  const partners = useAppStore(s => s.partners);
  const projects = useAppStore(s => s.projects);
  const addProject = useAppStore(s => s.addProject);
  const updateProject = useAppStore(s => s.updateProject);
  const deleteProject = useAppStore(s => s.deleteProject);
  const addSavedConcept = useAppStore(s => s.addSavedConcept);

  // STARS concept store
  const store = useStarsConceptStore();

  // Generation hook
  const generation = useStarsGeneration();

  // Local UI state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const canProceed = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        return (
          store.idea.trim().length > 10 &&
          store.targetGroup.trim().length > 0 &&
          store.problem.trim().length > 10
        );
      case 2:
        // Must have selected a concept proposal
        return store.selectedConceptId !== null;
      case 3:
        return store.selectedPartners.length > 0;
      case 4:
        return store.challengeNarrative.trim().length > 0 && store.goals.length > 0;
      case 5:
        return true;
      default:
        return true;
    }
  }, [
    store.idea, store.targetGroup, store.problem,
    store.selectedConceptId, store.selectedPartners,
    store.challengeNarrative, store.goals,
  ]);

  // ============================================================================
  // SAVE / LOAD / RESET
  // ============================================================================

  const saveDraft = useCallback(() => {
    const selectedConcept = store.conceptProposals.find(c => c.id === store.selectedConceptId);
    const draftTitle = store.projectTitle || selectedConcept?.title || store.idea.substring(0, 60) || 'STARS Entwurf';
    const draftAcronym = store.projectAcronym || selectedConcept?.acronym || '';

    // Extract pure state for saving (exclude action methods)
    const { updateField, updateState, setCurrentStep, resetState, ...starsDevState } = store;

    const projectPayload = {
      title: draftTitle,
      acronym: draftAcronym,
      status: 'CONCEPT' as any,
      sector: store.sector as any,
      actionType: store.actionType as any,
      problemStatement: store.problem,
      conceptDeveloperState: {
        ...starsDevState,
        conceptMode: 'stars' as const,
      },
    };

    if (savedProjectId) {
      updateProject(savedProjectId, projectPayload);
    } else {
      const id = addProject({
        ...projectPayload,
        budgetTier: store.budgetTier || (store.actionType === 'KA220' ? 250000 : 60000),
        duration: store.duration || (store.actionType === 'KA210' ? 12 : 24),
        callYear: new Date().getFullYear(),
        horizontalPriorities: [],
        rootCauses: [],
        statistics: [],
        targetGroups: [],
        objectives: [],
        consortium: [],
        workPackages: [],
        results: [],
        indicators: [],
        disseminationChannels: [],
        multiplierEvents: [],
      });
      setSavedProjectId(id);
    }

    setSaveMessage('STARS-Entwurf gespeichert!');
    setTimeout(() => setSaveMessage(null), 3000);
  }, [store, savedProjectId, addProject, updateProject]);

  const loadDraft = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project?.conceptDeveloperState) return;
    const savedState = project.conceptDeveloperState;
    store.updateState(savedState);
    setSavedProjectId(projectId);
  }, [projects, store]);

  const deleteDraft = useCallback((projectId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!window.confirm('Diesen STARS-Entwurf wirklich loschen?')) return;
    deleteProject(projectId);
    if (savedProjectId === projectId) {
      setSavedProjectId(null);
    }
  }, [deleteProject, savedProjectId]);

  const resetAll = useCallback(() => {
    if (!window.confirm('Wirklich alle Eingaben verwerfen und neu anfangen?')) return;
    store.resetState();
    setSavedProjectId(null);
  }, [store]);

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const navigateStep = useCallback((newStep: number) => {
    store.setCurrentStep(newStep);

    // Auto-save on step navigation if there is meaningful content
    if (savedProjectId && store.idea.trim()) {
      const { updateField, updateState, setCurrentStep, resetState, ...starsDevState } = store;
      const selectedConcept = store.conceptProposals.find(c => c.id === store.selectedConceptId);
      updateProject(savedProjectId, {
        title: store.projectTitle || selectedConcept?.title || store.idea.substring(0, 60) || 'STARS Entwurf',
        conceptDeveloperState: {
          ...starsDevState,
          currentStep: newStep,
          conceptMode: 'stars' as const,
        },
      });
    }
  }, [store, savedProjectId, updateProject]);

  // ============================================================================
  // CONCEPT PROGRESS CALCULATION
  // ============================================================================

  const getConceptProgress = useCallback((project: typeof projects[0]) => {
    const devState = project.conceptDeveloperState;
    if (!devState) return { percent: 0, step: 0, label: 'Nicht gestartet' };
    const step = devState.currentStep || 1;

    let dataPoints = 0;
    if (devState.idea?.trim()) dataPoints++;
    if (devState.targetGroup?.trim()) dataPoints++;
    if (devState.problem?.trim()) dataPoints++;
    if (devState.selectedConceptId) dataPoints++;
    if (devState.sources?.length > 0) dataPoints++;
    if (devState.selectedPartners?.length > 0) dataPoints++;
    if (devState.challengeNarrative?.trim()) dataPoints++;
    if (devState.goals?.length > 0) dataPoints++;
    if (devState.fullExpose) dataPoints++;
    // 9 possible data points
    const percent = Math.round((dataPoints / 9) * 100);

    const stepLabels = ['Projektrahmen', 'Recherche', 'Partnerschaft', 'Projektkern', 'Expose & Export'];
    return { percent, step, label: stepLabels[step - 1] || `Schritt ${step}` };
  }, []);

  // ============================================================================
  // RESUME FROM URL
  // ============================================================================

  useEffect(() => {
    if (!resumeProjectId || savedProjectId) return;
    const project = projects.find(p => p.id === resumeProjectId);
    if (project?.conceptDeveloperState) {
      loadDraft(resumeProjectId);
    }
  }, [resumeProjectId, projects, savedProjectId, loadDraft]);

  // ============================================================================
  // EXPORT TO PIPELINE
  // ============================================================================

  const exportToPipeline = useCallback(() => {
    const selectedConcept = store.conceptProposals.find(c => c.id === store.selectedConceptId);
    const title = store.projectTitle || selectedConcept?.title || 'STARS Projekt';
    const acronym = store.projectAcronym || selectedConcept?.acronym || '';
    const duration = store.duration || (store.actionType === 'KA210' ? 12 : 24);

    // -----------------------------------------------------------------------
    // Build the detailedConcept — this is the Generator's "WICHTIGSTE QUELLE"
    // Use the full exposé if available, otherwise assemble from sections.
    // -----------------------------------------------------------------------
    const detailedConcept = store.fullExpose || [
      store.challengeNarrative && `## The Challenge\n${store.challengeNarrative}`,
      store.opportunityNarrative && `## The Opportunity\n${store.opportunityNarrative}`,
      store.projectResponse && `## The Project Response\n${store.projectResponse}`,
      store.goals.length > 0 && `## Project Goals\n${store.goals.map(g =>
        `**G${g.number}: ${g.statement}**\nRationale: ${g.rationale}\nMeasurable Outcome: ${g.measurableOutcome}`
      ).join('\n\n')}`,
      store.starsTargetGroups.length > 0 && `## Target Groups\n${store.starsTargetGroups.map(tg =>
        `**${tg.level}: ${tg.name}** — ${tg.description}\nNeeds: ${tg.characteristicsAndNeeds}\nRole: ${tg.roleInProject}\nReach: ${tg.estimatedReach}`
      ).join('\n\n')}`,
      store.methodPrinciples.length > 0 && `## Methodological Approach\n${store.methodPrinciples.map(mp =>
        `**${mp.name}**: ${mp.description}`
      ).join('\n\n')}`,
    ].filter(Boolean).join('\n\n---\n\n');

    // -----------------------------------------------------------------------
    // Build originalConcept — the data structure the Generator actually reads
    // -----------------------------------------------------------------------
    const originalConcept = {
      id: `stars_concept_${Date.now()}`,
      createdAt: new Date(),
      status: 'APPLIED' as const,
      partnerIds: store.selectedPartners.map(sp => sp.partnerId),
      initialIdea: store.idea,
      sector: store.sector as any,
      actionType: store.actionType as any,
      conceptMode: 'stars' as const,

      // Fields the Generator reads in AI prompts:
      title,
      acronym,
      priority: store.priorityFocus || store.euPolicyAlignment?.[0] || '',
      problemStatement: store.challengeNarrative || store.enhancedProblem || store.problem,
      innovation: selectedConcept?.innovation || store.projectResponse || '',
      expectedImpact: selectedConcept?.summary || '',
      detailedConcept,
      mainOutputs: selectedConcept?.mainOutputs || [],
      consortiumFit: store.partnershipNarrative || '',
      duration,

      // Study references from analyzed sources
      studyReferences: store.sources
        .filter(s => s.isAnalyzed)
        .map(s => ({
          title: s.title,
          url: '',
          snippet: s.summary || s.keyFindings?.join('; ') || '',
        })),

      // STARS goals → Generator objectives
      objectives: store.goals.map(g => ({
        text: g.statement,
        indicators: [g.measurableOutcome],
        sources: [] as string[],
        erasmusPriority: '',
      })),

      // Empty WPs — Generator creates these
      workPackages: [],

      // STARS-specific structured data for enhanced Generator prompts
      starsData: {
        challengeNarrative: store.challengeNarrative,
        opportunityNarrative: store.opportunityNarrative,
        projectResponse: store.projectResponse,
        goals: store.goals,
        starsTargetGroups: store.starsTargetGroups,
        methodPrinciples: store.methodPrinciples,
        partnershipNarrative: store.partnershipNarrative,
        associatedPartners: store.associatedPartners,
        euPolicyAlignment: store.euPolicyAlignment,
        fullExpose: store.fullExpose || '',
      },
    };

    const projectData: any = {
      title,
      acronym,
      status: 'DRAFT',
      actionType: store.actionType as any,
      sector: store.sector as any,
      budgetTier: store.budgetTier || (store.actionType === 'KA220' ? 250000 : 60000),
      duration,
      callYear: new Date().getFullYear(),
      horizontalPriorities: store.euPolicyAlignment || [],
      problemStatement: store.challengeNarrative || store.problem,
      rootCauses: [],
      statistics: [],
      targetGroups: store.starsTargetGroups.map((tg, idx) => ({
        id: `tg_${idx}`,
        name: tg.name,
        size: 0,
        characteristics: tg.characteristicsAndNeeds,
        needs: [],
      })),
      objectives: store.goals.map((g, idx) => ({
        id: `obj_${idx}`,
        code: `G${g.number}`,
        type: 'SPECIFIC' as const,
        description: g.statement,
        indicators: [g.measurableOutcome],
      })),
      consortium: store.selectedPartners.map(sp => ({
        id: `cm_${sp.partnerId}`,
        partnerId: sp.partnerId,
        role: sp.role,
        budgetShare: 0,
        workPackageLeadership: [],
      })),
      workPackages: [],
      results: [],
      indicators: [],
      disseminationChannels: [],
      multiplierEvents: [],
      originalConcept,
      starsData: originalConcept.starsData,
      conceptDeveloperState: undefined, // Clear dev state after export
    };

    let projectId: string;
    if (savedProjectId) {
      updateProject(savedProjectId, projectData);
      projectId = savedProjectId;
    } else {
      projectId = addProject(projectData);
    }

    router.push(`/generator?project=${projectId}&fromConcept=true`);
  }, [store, savedProjectId, addProject, updateProject, router]);

  // ============================================================================
  // SAVE CONCEPT TO LIBRARY
  // ============================================================================

  const saveConceptToLibrary = useCallback(() => {
    const selectedConcept = store.conceptProposals.find(c => c.id === store.selectedConceptId);
    const title = store.projectTitle || selectedConcept?.title || 'STARS Projekt';
    const acronym = store.projectAcronym || selectedConcept?.acronym || '';

    addSavedConcept({
      title,
      acronym,
      priority: store.priorityFocus || '',
      problemStatement: store.challengeNarrative || store.problem,
      innovation: selectedConcept?.innovation || store.projectResponse || '',
      detailedConcept: store.fullExpose || undefined,
      workPackages: [],
      mainOutputs: selectedConcept?.mainOutputs || [],
      expectedImpact: '',
      consortiumFit: store.partnershipNarrative || '',
      duration: store.duration,
      status: 'DRAFT',
      partnerIds: store.selectedPartners.map(sp => sp.partnerId),
      initialIdea: store.idea,
      sector: store.sector as any,
      actionType: store.actionType as any,
      conceptMode: 'stars',
      starsData: {
        challengeNarrative: store.challengeNarrative,
        opportunityNarrative: store.opportunityNarrative,
        projectResponse: store.projectResponse,
        goals: store.goals,
        starsTargetGroups: store.starsTargetGroups,
        methodPrinciples: store.methodPrinciples,
        partnershipNarrative: store.partnershipNarrative,
        associatedPartners: store.associatedPartners,
        euPolicyAlignment: store.euPolicyAlignment,
        fullExpose: store.fullExpose || '',
      },
    });

    setSaveMessage('Konzept in Bibliothek gespeichert!');
    setTimeout(() => setSaveMessage(null), 3000);
  }, [store, addSavedConcept]);

  // ============================================================================
  // SAVE INDIVIDUAL CONCEPT PROPOSAL (from Step 2 — any of the 3 proposals)
  // ============================================================================

  const saveConceptProposalToLibrary = useCallback((concept: any) => {
    addSavedConcept({
      title: concept.title || 'Konzeptvorschlag',
      acronym: concept.acronym || '',
      priority: concept.euPolicyAlignment?.[0] || '',
      problemStatement: store.problem || '',
      innovation: concept.innovation || '',
      workPackages: [],
      mainOutputs: concept.mainOutputs || [],
      expectedImpact: concept.summary || '',
      consortiumFit: '',
      status: 'DRAFT',
      partnerIds: [],
      initialIdea: store.idea,
      sector: store.sector as any,
      actionType: store.actionType as any,
      conceptMode: 'stars',
    });
  }, [store.idea, store.problem, store.sector, store.actionType, addSavedConcept]);

  // ============================================================================
  // DERIVED
  // ============================================================================

  const currentStep = store.currentStep;
  const hasContent = store.idea.trim().length > 0 || store.selectedConceptId !== null;

  // Filter drafts that are STARS mode
  const starsDrafts = projects.filter(
    p => (p.status as string) === 'CONCEPT' && p.conceptDeveloperState?.conceptMode === 'stars'
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl text-white">
                <Star className="h-6 w-6" />
              </div>
              Projekt-Expose (STARS)
            </h1>
            <p className="text-gray-500 mt-1">
              Professionelles Projekt-Expose in 5 Schritten entwickeln
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onSwitchMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSwitchMode}
                className="text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                Modus wechseln
              </Button>
            )}
            <Button
              onClick={saveDraft}
              disabled={!hasContent}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
            <Button
              onClick={saveConceptToLibrary}
              disabled={!store.selectedConceptId}
              variant="outline"
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300"
            >
              <Library className="h-4 w-4 mr-2" />
              In Bibliothek
            </Button>
            <Button
              variant="outline"
              onClick={resetAll}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Neu anfangen
            </Button>
          </div>
        </div>
      </div>

      {/* Save Confirmation Toast */}
      {saveMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {saveMessage}
        </div>
      )}

      {/* Saved STARS Drafts */}
      {starsDrafts.length > 0 && (
        <div className="mb-6 bg-white rounded-xl border shadow-sm p-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3 text-sm">
            <FolderOpen className="h-4 w-4 text-indigo-500" />
            Gespeicherte STARS-Entwurfe ({starsDrafts.length})
          </h3>
          <div className="space-y-2">
            {starsDrafts.map(draft => {
              const progress = getConceptProgress(draft);
              const isActive = savedProjectId === draft.id;
              return (
                <div
                  key={draft.id}
                  className={`rounded-lg border p-3 flex items-center gap-4 cursor-pointer transition-all ${
                    isActive
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => !isActive && loadDraft(draft.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm truncate">
                        {draft.acronym ? `${draft.acronym} — ` : ''}{draft.title || 'Unbenannter Entwurf'}
                      </span>
                      {isActive && (
                        <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 text-xs rounded-full font-medium shrink-0">
                          Aktiv
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              progress.percent === 100
                                ? 'bg-green-500'
                                : progress.percent > 50
                                  ? 'bg-indigo-500'
                                  : 'bg-blue-500'
                            }`}
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">
                        {progress.percent}% — {progress.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => deleteDraft(draft.id, e)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center gap-1 mb-8 bg-white p-3 rounded-xl border shadow-sm">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => navigateStep(step.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                    : isCompleted
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'text-gray-500 hover:bg-gray-100 cursor-pointer'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                <span className="hidden md:inline">{step.title}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border shadow-sm p-6">

        {/* ======================== STEP 1: PROJECT FRAME ======================== */}
        {currentStep === 1 && (
          <StarsStep1Frame
            store={store}
            enhanceIdea={async () => {
              setIsEnhancing(true);
              try { await generation.enhanceIdea(); } finally { setIsEnhancing(false); }
            }}
            isEnhancing={isEnhancing}
          />
        )}

        {/* ======================== STEP 2: RESEARCH & CONCEPTS ======================== */}
        {currentStep === 2 && (
          <StarsStep2Sources
            store={store}
            runAnalysis={generation.runAnalysis}
            handleFileUpload={generation.handleFileUpload}
            generateConceptProposals={generation.generateConceptProposals}
            selectConceptProposal={generation.selectConceptProposal}
            saveConceptProposal={saveConceptProposalToLibrary}
          />
        )}

        {/* ======================== STEP 3: PARTNERSHIP ======================== */}
        {currentStep === 3 && (
          <StarsStep3Partnership
            store={store}
            generatePartnershipNarrative={generation.generatePartnershipNarrative}
          />
        )}

        {/* ======================== STEP 4: PROJECT CORE ======================== */}
        {currentStep === 4 && (
          <StarsStep4Core
            store={store}
            generateChallenge={generation.generateChallenge}
            generateOpportunity={generation.generateOpportunity}
            generateResponse={generation.generateResponse}
            generateGoals={generation.generateGoals}
            generateTargetGroups={generation.generateTargetGroups}
            generateMethodology={generation.generateMethodology}
          />
        )}

        {/* ======================== STEP 5: EXPOSE & EXPORT ======================== */}
        {currentStep === 5 && (
          <StarsStep5Summary
            exportToPipeline={exportToPipeline}
          />
        )}

        {/* ======================== NAVIGATION ======================== */}
        <div className="flex justify-between items-center pt-6 mt-6 border-t">
          <Button
            variant="outline"
            onClick={() => navigateStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Zuruck
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={!hasContent}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
            {store.selectedConceptId && (
              <Button
                variant="outline"
                onClick={saveConceptToLibrary}
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                size="sm"
              >
                <Library className="h-3.5 w-3.5 mr-1.5" />
                Bibliothek
              </Button>
            )}
            <span className="text-sm text-gray-400">
              Schritt {currentStep} von {STEPS.length}
            </span>
          </div>

          {currentStep < STEPS.length ? (
            <Button
              onClick={() => navigateStep(Math.min(STEPS.length, currentStep + 1))}
              disabled={!canProceed(currentStep)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Weiter
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={exportToPipeline}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
            >
              Zum Generator
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
