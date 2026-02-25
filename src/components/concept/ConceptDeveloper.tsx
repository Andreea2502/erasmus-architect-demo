"use client";

import React, { useState, useEffect } from 'react';
import {
  Lightbulb, Users, Target, Layers, ArrowRight, ArrowLeft,
  Check, BookOpen, RefreshCw, Save, Rocket, CheckCircle2,
  FolderOpen, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useLanguageStore } from '@/store/language-store';
import { extractTextFromPDF, extractTextFromDocx } from '@/lib/rag-system';

import { Step1Idea } from './steps/Step1Idea';
import { Step2Sources } from './steps/Step2Sources';
import { Step3Consortium } from './steps/Step3Consortium';
import { Step4Objectives } from './steps/Step4Objectives';
import { Step5WorkPackages } from './steps/Step5WorkPackages';
import { Step6Summary } from './steps/Step6Summary';

import { useConceptStore, initialConceptState } from '@/store/concept-store';
import { useConceptGeneration } from '@/hooks/useConceptGeneration';
import { ResearchSource } from '@/types/concept';
import { SECTORS, ERASMUS_PRIORITIES } from '@/lib/concept-prompts';

// ============================================================================
// STEP DEFINITIONS
// ============================================================================

const STEPS = [
  { id: 1, title: 'Idee & Research', icon: Lightbulb, color: 'amber' },
  { id: 2, title: 'Quellen & Konzepte', icon: BookOpen, color: 'blue' },
  { id: 3, title: 'Konsortium', icon: Users, color: 'purple' },
  { id: 4, title: 'Ziele & Ergebnisse', icon: Target, color: 'green' },
  { id: 5, title: 'WP-Struktur', icon: Layers, color: 'orange' },
  { id: 6, title: 'Zusammenfassung', icon: Rocket, color: 'indigo' },
];

export function ConceptDeveloper({ resumeProjectId }: { resumeProjectId?: string } = {}) {
  const language = useLanguageStore(s => s.language);
  const partners = useAppStore(s => s.partners);
  const projects = useAppStore(s => s.projects);
  const addProject = useAppStore(s => s.addProject);
  const updateProject = useAppStore(s => s.updateProject);
  const deleteProject = useAppStore(s => s.deleteProject);
  const addSavedConcept = useAppStore(s => s.addSavedConcept);

  const store = useConceptStore();
  const { runAnalysis } = useConceptGeneration();

  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Microphone state
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = language === 'de' ? 'de-DE' : 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          // We only update if it's final to avoid jumbled text during pauses
          if (event.results[event.results.length - 1].isFinal) {
            store.updateState({ idea: store.idea + (store.idea ? ' ' : '') + currentTranscript });
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
          if (event.error === 'not-allowed') {
            alert('Bitte erlaube den Mikrofonzugriff in deinem Browser.');
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        setRecognitionInstance(recognition);
      }
    }
  }, [language, store]); // Needed 'store' because the closure captures store.idea?
  // Store reference can be tricky in closure. Better to use the latest state if possible.
  // We'll trust that the store.idea is sufficiently updated or we use store.getState().

  // Better approach for speech recognition closure
  useEffect(() => {
    if (recognitionInstance) {
      recognitionInstance.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (event.results[event.results.length - 1].isFinal) {
          useConceptStore.setState((state) => ({ idea: state.idea + (state.idea ? ' ' : '') + currentTranscript }));
        }
      };
    }
  }, [recognitionInstance]);


  const toggleRecording = () => {
    if (!recognitionInstance) {
      alert('Dein Browser unterstützt leider keine Spracherkennung. Bitte nutze Chrome, Edge oder Safari.');
      return;
    }

    if (isRecording) {
      recognitionInstance.stop();
    } else {
      recognitionInstance.start();
      setIsRecording(true);
    }
  };

  // Timeout wrapper for file extraction
  const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label}: Zeitlimit überschritten (${ms / 1000}s).`)), ms)
      ),
    ]);
  };

  // ============================================================================
  // SAVE / LOAD / RESET
  // ============================================================================

  const saveDraft = () => {
    const conceptTitle = store.concepts.find(c => c.id === store.selectedConceptId)?.title;
    const draftTitle = conceptTitle || (store.idea.substring(0, 60) || 'Neues Konzept');
    const draftAcronym = store.concepts.find(c => c.id === store.selectedConceptId)?.acronym || '';

    // Extract pure state for saving
    const { updateField, updateState, setCurrentStep, resetState, ...conceptDevState } = store;

    if (savedProjectId) {
      updateProject(savedProjectId, {
        title: draftTitle,
        acronym: draftAcronym,
        status: 'CONCEPT' as any,
        sector: store.sector as any,
        actionType: store.actionType as any,
        problemStatement: store.problem,
        conceptDeveloperState: conceptDevState,
      });
    } else {
      const id = addProject({
        title: draftTitle,
        acronym: draftAcronym,
        status: 'CONCEPT' as any,
        actionType: store.actionType as any,
        sector: store.sector as any,
        budgetTier: store.budgetTier || (store.actionType === 'KA220' ? 250000 : 60000),
        duration: store.duration || (store.actionType === 'KA210' ? 12 : 24),
        callYear: new Date().getFullYear(),
        horizontalPriorities: [],
        problemStatement: store.problem,
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
        conceptDeveloperState: conceptDevState,
      });
      setSavedProjectId(id);
    }
    setSaveMessage('Konzept-Entwurf gespeichert!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const loadDraft = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project?.conceptDeveloperState) return;
    const savedState = project.conceptDeveloperState;
    store.updateState(savedState);
    setSavedProjectId(projectId);
  };

  const deleteDraft = (projectId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!window.confirm('Diesen Konzept-Entwurf wirklich löschen?')) return;
    deleteProject(projectId);
    if (savedProjectId === projectId) {
      setSavedProjectId(null);
    }
  };

  const resetAll = () => {
    if (!window.confirm('Wirklich alle Eingaben verwerfen und neu anfangen?')) return;
    store.resetState();
    setSavedProjectId(null);
  };

  const handleSaveConceptToLibrary = (conceptId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const concept = store.concepts.find(c => c.id === conceptId);
    if (!concept) return;

    addSavedConcept({
      status: 'DRAFT',
      title: concept.title,
      acronym: concept.acronym,
      priority: '',
      problemStatement: concept.problemStatement,
      innovation: concept.innovation,
      mainOutputs: concept.mainOutputs,
      expectedImpact: '',
      consortiumFit: concept.consortiumFit || '',
      actionType: store.actionType as any,
      sector: store.sector as any,
      initialIdea: store.idea,
      partnerIds: store.selectedPartners.map(p => p.partnerId),
      objectives: [],
      workPackages: [],
      multiplierEvents: { count: 0, participantsPerEvent: 0 },
      duration: store.duration || 24,
    });

    store.updateField('concepts', store.concepts.map(c => c.id === conceptId ? { ...c, savedForLater: true } : c));
    setSaveMessage('Konzept in Bibliothek gespeichert!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const navigateStep = (newStep: number) => {
    store.setCurrentStep(newStep);
    if (savedProjectId && store.idea.trim()) {
      const conceptTitle = store.concepts.find(c => c.id === store.selectedConceptId)?.title;
      const { updateField, updateState, setCurrentStep, resetState, ...conceptDevState } = store;
      updateProject(savedProjectId, {
        title: conceptTitle || store.idea.substring(0, 60) || 'Neues Konzept',
        conceptDeveloperState: { ...conceptDevState, currentStep: newStep },
      });
    }
  };

  const getConceptProgress = (project: typeof projects[0]) => {
    const devState = project.conceptDeveloperState;
    if (!devState) return { percent: 0, step: 0, label: 'Nicht gestartet' };
    const step = devState.currentStep || 1;
    let dataPoints = 0;
    if (devState.idea?.trim()) dataPoints++;
    if (devState.targetGroup?.trim()) dataPoints++;
    if (devState.problem?.trim()) dataPoints++;
    if (devState.sources?.length > 0) dataPoints++;
    if (devState.conceptsGenerated) dataPoints++;
    if (devState.selectedPartners?.length > 0) dataPoints++;
    if (devState.objectivesGenerated) dataPoints++;
    if (devState.wpGenerated) dataPoints++;
    // 8 possible data points
    const percent = Math.round((dataPoints / 8) * 100);
    const stepLabels = ['Idee', 'Quellen & Konzepte', 'Konsortium', 'Ziele', 'WP-Struktur', 'Zusammenfassung'];
    return { percent, step, label: stepLabels[step - 1] || `Schritt ${step}` };
  };

  // Resume draft from URL parameter
  useEffect(() => {
    if (!resumeProjectId || savedProjectId) return;
    const project = projects.find(p => p.id === resumeProjectId);
    if (project?.conceptDeveloperState) {
      loadDraft(resumeProjectId);
    }
  }, [resumeProjectId, projects]);

  // ============================================================================
  // SOURCE UPLOADS (Step 2 logic that doesn't fit elegantly in external steps yet)
  // ============================================================================

  const handleSourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

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

      // Ensure we immediately update state using previous state to prevent race conditions
      useConceptStore.setState((prev) => ({ sources: [...prev.sources, newSource] }));

      // Process extraction
      try {
        let text = '';
        if (ext === 'pdf') {
          const result = await withTimeout(extractTextFromPDF(file), 30000, `PDF "${file.name}"`);
          text = result.text;
        } else if (ext === 'docx' || ext === 'doc') {
          text = await withTimeout(extractTextFromDocx(file), 30000, `DOCX "${file.name}"`);
        } else {
          text = await withTimeout(file.text(), 10000, `Datei "${file.name}"`);
        }

        const trimmedContent = text.substring(0, 50000);

        // Update to extracted
        useConceptStore.setState((prev) => ({
          sources: prev.sources.map(s => s.id === sourceId ? { ...s, content: trimmedContent, isExtracting: false } : s)
        }));

        // Auto-analyze
        if (trimmedContent.length > 50) {
          runAnalysis(sourceId, newSource.title, trimmedContent);
        }
      } catch (err) {
        console.error(`Error extracting ${file.name}:`, err);
        useConceptStore.setState((prev) => ({
          sources: prev.sources.map(s => s.id === sourceId ? {
            ...s,
            isExtracting: false,
            error: `Datei konnte nicht gelesen werden: ${ext.toUpperCase()}-Format fehlerhaft`,
          } : s)
        }));
      }
    }
    e.target.value = '';
  };


  // ============================================================================
  // STEP 6: Export to Pipeline
  // ============================================================================

  const exportToPipeline = () => {
    const selectedConcept = store.concepts.find(c => c.id === store.selectedConceptId);
    if (!selectedConcept) return;

    const projectData: any = {
      title: selectedConcept.title,
      acronym: selectedConcept.acronym,
      status: 'DRAFT',
      actionType: store.actionType as any,
      sector: store.sector as any,
      budgetTier: store.actionType === 'KA220' ? 250000 : 60000,
      duration: store.actionType === 'KA210' ? 12 : 24,
      callYear: new Date().getFullYear(),
      horizontalPriorities: selectedConcept.erasmusPriorities || [],
      problemStatement: selectedConcept.problemStatement,
      rootCauses: [],
      statistics: [],
      targetGroups: selectedConcept.targetGroups?.map((tg, idx) => ({
        id: `tg_${idx}`,
        name: tg,
        size: 0,
        characteristics: '',
        needs: [],
      })) || [],
      objectives: store.objectives
        .filter(o => store.selectedObjectiveIds.includes(o.id))
        .map((o, idx) => ({
          id: `obj_${idx}`,
          code: `SO${idx + 1}`,
          type: 'SPECIFIC' as const,
          description: o.text,
          indicators: o.indicators,
        })),
      consortium: store.selectedPartners.map(sp => ({
        id: `cm_${sp.partnerId}`,
        partnerId: sp.partnerId,
        role: sp.role,
        budgetShare: 0,
        workPackageLeadership: [],
      })),
      workPackages: [],
      results: selectedConcept.mainOutputs.map((output, i) => ({
        id: `result_${i}`,
        code: `R${i + 1}`,
        title: output,
        description: '',
        type: 'other',
        workPackageId: '',
        languages: ['en'],
        targetAudience: selectedConcept.targetGroups || [],
        innovationLevel: 3 as const,
        transferPotential: 3 as const,
      })),
      indicators: [],
      disseminationChannels: [],
      multiplierEvents: [],
      originalConcept: {
        id: `concept_${Date.now()}`,
        createdAt: new Date(),
        status: 'APPLIED' as const,
        partnerIds: store.selectedPartners.map(sp => sp.partnerId),
        initialIdea: store.idea,
        sector: store.sector as any,
        actionType: store.actionType as any,
        title: selectedConcept.title,
        acronym: selectedConcept.acronym,
        priority: selectedConcept.erasmusPriorities?.[0] || '',
        problemStatement: selectedConcept.problemStatement,
        innovation: selectedConcept.innovation,
        workPackages: store.wpSuggestions
          .filter(wp => store.selectedWpNumbers.includes(wp.number))
          .map(wp => ({
            number: wp.number,
            type: wp.type as any,
            title: wp.title,
            description: wp.description,
            lead: wp.lead,
            activities: wp.activities,
            deliverables: wp.deliverables,
            duration: wp.duration,
          })),
        mainOutputs: selectedConcept.mainOutputs,
        expectedImpact: selectedConcept.summary,
        consortiumFit: store.selectedPartners.map(sp => {
          const p = partners.find(pp => pp.id === sp.partnerId);
          return p ? `${sp.role}: ${p.organizationName} (${p.country})` : '';
        }).filter(Boolean).join('; '),
        studyReferences: store.sources.map(s => ({
          title: s.title,
          url: '',
          snippet: s.summary || '',
        })),
        objectives: store.objectives
          .filter(o => store.selectedObjectiveIds.includes(o.id))
          .map(o => ({
            text: o.text,
            indicators: o.indicators,
            sources: o.sources || [],
            erasmusPriority: o.erasmusPriority,
          })),
      },
      conceptDeveloperState: undefined, // Clear dev state after export
    };

    let projectId: string;
    if (savedProjectId) {
      updateProject(savedProjectId, projectData);
      projectId = savedProjectId;
    } else {
      projectId = addProject(projectData);
    }

    // Redirect to generator with this project
    window.location.href = `/generator?project=${projectId}&fromConcept=true`;
  };

  const currentStep = store.currentStep;

  const canProceed = (step: number) => {
    switch (step) {
      case 1: return store.idea.trim().length > 10 && store.targetGroup.trim().length > 0 && store.problem.trim().length > 10;
      case 2: return store.selectedConceptId !== null;
      case 3: return store.selectedPartners.length > 0;
      case 4: return store.objectives.filter(o => store.selectedObjectiveIds.includes(o.id)).length > 0;
      case 5: return store.wpSuggestions.filter(wp => store.selectedWpNumbers.includes(wp.number)).length > 0;
      default: return true;
    }
  };

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
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white">
                <Lightbulb className="h-6 w-6" />
              </div>
              Konzeptentwickler
            </h1>
            <p className="text-gray-500 mt-1">Von der Idee zum fertigen Projektkonzept in 6 Schritten</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={saveDraft}
              disabled={!store.idea.trim()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Speichern
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

      {/* Saved Concept Drafts */}
      {(() => {
        const conceptDrafts = projects.filter(p => (p.status as string) === 'CONCEPT');
        if (conceptDrafts.length === 0) return null;
        return (
          <div className="mb-6 bg-white rounded-xl border shadow-sm p-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3 text-sm">
              <FolderOpen className="h-4 w-4 text-amber-500" />
              Gespeicherte Entwürfe ({conceptDrafts.length})
            </h3>
            <div className="space-y-2">
              {conceptDrafts.map(draft => {
                const progress = getConceptProgress(draft);
                const isActive = savedProjectId === draft.id;
                return (
                  <div
                    key={draft.id}
                    className={`rounded-lg border p-3 flex items-center gap-4 cursor-pointer transition-all ${isActive ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    onClick={() => !isActive && loadDraft(draft.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm truncate">
                          {draft.acronym ? `${draft.acronym} — ` : ''}{draft.title || 'Unbenannter Entwurf'}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-full font-medium shrink-0">
                            Aktiv
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${progress.percent === 100 ? 'bg-green-500' :
                                progress.percent > 50 ? 'bg-amber-500' : 'bg-blue-500'
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
        );
      })()}

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
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
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

        {/* ======================== STEP 1: IDEA ======================== */}
        {currentStep === 1 && (
          <Step1Idea
            language={language}
            isRecording={isRecording}
            toggleRecording={toggleRecording}
            SECTORS={SECTORS}
            ERASMUS_PRIORITIES={ERASMUS_PRIORITIES}
          />
        )}

        {/* ======================== STEP 2: SOURCES & CONCEPTS ======================== */}
        {currentStep === 2 && (
          <Step2Sources
            handleSourceUpload={handleSourceUpload}
            handleSaveConceptToLibrary={handleSaveConceptToLibrary}
          />
        )}

        {/* ======================== STEP 3: CONSORTIUM ======================== */}
        {currentStep === 3 && (
          <Step3Consortium />
        )}

        {/* ======================== STEP 4: OBJECTIVES ======================== */}
        {currentStep === 4 && (
          <Step4Objectives />
        )}

        {/* ======================== STEP 5: WP STRUCTURE ======================== */}
        {currentStep === 5 && (
          <Step5WorkPackages />
        )}

        {/* ======================== STEP 6: SUMMARY & EXPORT ======================== */}
        {currentStep === 6 && (
          <Step6Summary
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
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={!store.idea.trim()}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
            <span className="text-sm text-gray-400">
              Schritt {currentStep} von {STEPS.length}
            </span>
          </div>

          {currentStep < STEPS.length && (
            <Button
              onClick={() => navigateStep(Math.min(STEPS.length, currentStep + 1))}
              disabled={!canProceed(currentStep)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Weiter
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
