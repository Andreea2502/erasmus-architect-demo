"use client";

import React, { useState, useCallback, useEffect } from 'react';
import {
  Lightbulb, Search, Upload, FileText, Users, Target,
  Layers, ArrowRight, ArrowLeft, Check, Copy, ChevronDown,
  ChevronUp, Sparkles, BookOpen, Globe, Plus, X, Star,
  RefreshCw, Save, Rocket, AlertTriangle, CheckCircle2,
  FolderOpen, Trash2, XCircle, Scale, Trophy, ThumbsDown, ThumbsUp, Mic, MicOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/app-store';
import { useLanguageStore } from '@/store/language-store';
import { generateContentAction, generateJsonContentAction } from '@/app/actions/gemini';
import { extractTextFromPDF, extractTextFromDocx } from '@/lib/rag-system';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ============================================================================
// TYPES
// ============================================================================

interface ResearchSource {
  id: string;
  title: string;
  content: string;
  type: 'study' | 'report' | 'article' | 'other';
  fileType?: string;
  summary?: string;
  keyFindings?: string[];
  isAnalyzed: boolean;
  isAnalyzing: boolean;
  isExtracting: boolean;
  error?: string;
}

interface ConceptProposal {
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

interface SelectedPartner {
  partnerId: string;
  role: 'COORDINATOR' | 'PARTNER';
}

interface SmartObjective {
  id: string;
  text: string;
  indicators: string[];
  sources: string[]; // References to research sources
  erasmusPriority?: string;
}

interface WPSuggestion {
  number: number;
  title: string;
  type: string;
  description: string;
  activities: string[];
  deliverables: string[];
  duration: { start: number; end: number };
  lead: string;
}

interface ConceptState {
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
  isTranslatingConcept?: boolean;
  detailedConceptError?: string;
}

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

const SECTORS = [
  { value: 'ADU', label: 'Erwachsenenbildung' },
  { value: 'VET', label: 'Berufsbildung' },
  { value: 'SCH', label: 'Schulbildung' },
  { value: 'YOU', label: 'Jugend' },
  { value: 'HED', label: 'Hochschulbildung' },
];

const ERASMUS_PRIORITIES = [
  { value: '', label: 'Kein spezifischer Schwerpunkt' },
  { value: 'Digitale Transformation (KI, digitale Bildung)', label: 'Digitale Transformation (inkl. KI)' },
  { value: 'Inklusion und Vielfalt', label: 'Inklusion und Vielfalt' },
  { value: 'Umwelt und Bekämpfung des Klimawandels', label: 'Umwelt & Klimawandel' },
  { value: 'Teilhabe am demokratischen Leben', label: 'Demokratische Teilhabe' },
  { value: 'Anderes', label: 'Anderes (selbst definieren)' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConceptDeveloper({ resumeProjectId }: { resumeProjectId?: string } = {}) {
  const language = useLanguageStore(s => s.language);
  const partners = useAppStore(s => s.partners);
  const projects = useAppStore(s => s.projects);
  const addProject = useAppStore(s => s.addProject);
  const updateProject = useAppStore(s => s.updateProject);
  const deleteProject = useAppStore(s => s.deleteProject);
  const addSavedConcept = useAppStore(s => s.addSavedConcept);

  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
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
            setState(prev => ({ ...prev, idea: prev.idea + (prev.idea ? ' ' : '') + currentTranscript }));
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
  }, [language]);

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

  const [state, setState] = useState<ConceptState>({
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
    sources: [],
    concepts: [],
    selectedConceptId: null,
    conceptsGenerated: false,
    isComparingConcepts: false,
    conceptComparisonResult: null,
    compareConceptsError: undefined,
    selectedPartners: [],
    partnerSearchQuery: '',
    objectives: [],
    selectedObjectiveIds: [],
    objectivesGenerated: false,
    wpSuggestions: [],
    selectedWpNumbers: [],
    wpGenerated: false,
    detailedConcept: null,
    isGeneratingDetailedConcept: false,
    isTranslatingConcept: false,
  });

  // Helper to update state
  const update = useCallback((updates: Partial<ConceptState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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

  const initialState: ConceptState = {
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
    sources: [],
    concepts: [],
    selectedConceptId: null,
    conceptsGenerated: false,
    isComparingConcepts: false,
    conceptComparisonResult: null,
    compareConceptsError: undefined,
    selectedPartners: [],
    partnerSearchQuery: '',
    objectives: [],
    selectedObjectiveIds: [],
    objectivesGenerated: false,
    wpSuggestions: [],
    selectedWpNumbers: [],
    wpGenerated: false,
    detailedConcept: null,
    isGeneratingDetailedConcept: false,
  };

  const saveDraft = () => {
    const conceptTitle = state.concepts.find(c => c.id === state.selectedConceptId)?.title;
    const draftTitle = conceptTitle || (state.idea.substring(0, 60) || 'Neues Konzept');
    const draftAcronym = state.concepts.find(c => c.id === state.selectedConceptId)?.acronym || '';

    const conceptDevState = { ...state, currentStep };

    if (savedProjectId) {
      updateProject(savedProjectId, {
        title: draftTitle,
        acronym: draftAcronym,
        status: 'CONCEPT' as any,
        sector: state.sector as any,
        actionType: state.actionType as any,
        problemStatement: state.problem,
        conceptDeveloperState: conceptDevState,
      });
    } else {
      const id = addProject({
        title: draftTitle,
        acronym: draftAcronym,
        status: 'CONCEPT' as any,
        actionType: state.actionType as any,
        sector: state.sector as any,
        budgetTier: state.budgetTier || (state.actionType === 'KA220' ? 250000 : 60000),
        duration: state.duration || (state.actionType === 'KA210' ? 12 : 24),
        callYear: new Date().getFullYear(),
        horizontalPriorities: [],
        problemStatement: state.problem,
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
    const { currentStep: savedStep, ...savedState } = project.conceptDeveloperState;
    setState(savedState as ConceptState);
    setCurrentStep(savedStep || 1);
    setSavedProjectId(projectId);
    setIsGenerating(false);
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
    setState(initialState);
    setCurrentStep(1);
    setIsGenerating(false);
    setSavedProjectId(null);
  };

  const handleSaveConceptToLibrary = (conceptId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const concept = state.concepts.find(c => c.id === conceptId);
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
      actionType: state.actionType as any,
      sector: state.sector as any,
      initialIdea: state.idea,
      partnerIds: state.selectedPartners.map(p => p.partnerId),
      objectives: [],
      workPackages: [],
      multiplierEvents: { count: 0, participantsPerEvent: 0 },
      duration: state.duration || 24,
    });

    // Optionale Visual Feedback (z.B. Button wird kurz grün)
    update({ concepts: state.concepts.map(c => c.id === conceptId ? { ...c, savedForLater: true } : c) });
    setSaveMessage('Konzept in Bibliothek gespeichert!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const navigateStep = (newStep: number) => {
    setCurrentStep(newStep);
    if (savedProjectId && state.idea.trim()) {
      const conceptTitle = state.concepts.find(c => c.id === state.selectedConceptId)?.title;
      updateProject(savedProjectId, {
        title: conceptTitle || state.idea.substring(0, 60) || 'Neues Konzept',
        conceptDeveloperState: { ...state, currentStep: newStep },
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
    // 8 possible data points (summary/export is step 6, no data to track)
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
  }, [resumeProjectId, projects]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================================
  // STEP 1: Idea & Research Prompts
  // ============================================================================

  const enhanceIdea = async () => {
    setIsGenerating(true);
    try {
      const sectorLabel = SECTORS.find(s => s.value === state.sector)?.label || state.sector;
      const prompt = `Du bist ein erfahrener Erasmus+ Projektentwickler im Bereich ${sectorLabel}.

Ein Nutzer hat seine Projektidee grob und umgangssprachlich beschrieben. Deine Aufgabe ist es, daraus eine klare, präzise und professionelle Formulierung zu machen, die für EU-Förderanträge geeignet ist.

ROHE IDEE DES NUTZERS:
"${state.idea}"

ZIELGRUPPE: ${state.targetGroup}
ERASMUS+ SCHWERPUNKT (PRIORITÄT): ${state.priorityFocus || 'Kein spezifischer Schwerpunkt vorgegeben'}

ROHES PROBLEM DES NUTZERS:
"${state.problem}"

AUFGABE:
1. Verstehe den Kern der Idee - was will der Nutzer eigentlich erreichen?
2. Formuliere die Idee als klaren, professionellen Projektansatz (3-4 Sätze). Behalte den inhaltlichen Kern bei, aber mache die Formulierung präzise, strukturiert und fachlich korrekt.
3. Formuliere das Problem/die Herausforderung klar und nachvollziehbar (3-4 Sätze). Stelle den Bedarf heraus.

REGELN:
- Behalte den INHALT und die INTENTION des Nutzers bei
- Erfinde NICHTS dazu, was der Nutzer nicht gesagt hat
- Mache es professioneller, aber nicht übertrieben akademisch
- Die Formulierung soll für Recherche-Prompts optimiert sein (klar, durchsuchbar, mit relevanten Fachbegriffen)
- Schreibe auf Deutsch

Antworte NUR im JSON-Format:
{
  "enhancedIdea": "Die aufbereitete Projektidee...",
  "enhancedProblem": "Die aufbereitete Problemstellung..."
}`;

      const response = await generateContentAction(prompt, 'Du bist Projektentwickler. Antworte NUR im JSON-Format. Kein Markdown.', 0.7, 30000);
      const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);

      update({
        enhancedIdea: parsed.enhancedIdea || state.idea,
        enhancedProblem: parsed.enhancedProblem || state.problem,
        isEnhanced: true,
      });
    } catch (e) {
      console.error('Enhance idea error:', e);
      // Fallback: verwende die Original-Texte
      update({
        enhancedIdea: state.idea,
        enhancedProblem: state.problem,
        isEnhanced: true,
      });
    }
    setIsGenerating(false);
  };

  const generateResearchPrompts = () => {
    update({ researchPromptsGenerated: true });
  };

  const getBedarfsanalysePrompt = () => {
    const sectorLabel = SECTORS.find(s => s.value === state.sector)?.label || state.sector;
    const ideaText = state.enhancedIdea || state.idea;
    const problemText = state.enhancedProblem || state.problem;
    return `Du bist ein erfahrener Recherche-Assistent für EU-Bildungsprojekte im Bereich ${sectorLabel}.

AUFGABE: Erstelle eine fundierte Bedarfsanalyse zum folgenden Thema.

THEMA / PROJEKTIDEE:
"${ideaText}"

ZIELGRUPPE: ${state.targetGroup}
ERASMUS+ SCHWERPUNKT (PRIORITÄT): ${state.priorityFocus || 'Kein spezifischer Schwerpunkt vorgegeben'}

PROBLEM / HERAUSFORDERUNG:
"${problemText}"

RECHERCHEKRITERIEN:
- NUR Studien und Berichte aus den letzten 3 Jahren (2023-2026).
- STRUKTURIERE DEINE RECHERCHE NACH DEM TRICHTER-PRINZIP (Funnel-Ansatz: Makro -> Meso -> Mikro).
- MAKRO-EBENE (International/Europäisch): Nutze primär Berichte von Organisationen mit anerkannter Analysekompetenz wie Eurydice-Netzwerk, CEDEFOP, OECD, Weltwirtschaftsforum und Europarat.
- EU-DATENBANKEN: Nutze Instrumente wie das EU-Kompetenzpanorama oder die ESCO-Klassifikation zur Untermauerung von Qualifikationslücken oder Arbeitsmarktbedürfnissen.
- MESO-EBENE (National/Regional): Beziehe dich auf Daten von nationalen statistischen Ämtern, Ministerien, regionalen Behörden, Arbeitsvermittlungsdiensten oder Branchen-/Berufsverbänden.
- MIKRO-EBENE (Lokal/Projektbezogen): Verweise auf eigene Erhebungen (z.B. Umfragen, Experteninterviews) oder erfolgreiche Ergebnisse aus Vorgängerprojekten.
- Nenne IMMER den vollständigen Titel der Studie, das Institut und das Erscheinungsjahr.
- Konkrete Zahlen, Prozentsätze und Statistiken sind zwingend erforderlich.

STRUKTUR DEINER ANALYSE (TRICHTER-PRINZIP):

1. MAKRO-EBENE: EUROPÄISCHE/GLOBALE LAGE (mit Zahlen)
- Wie ist die aktuelle Situation in Europa bezüglich "${problemText}"?
- Zitiere anerkannte Makro-Studien (z.B. OECD, Eurydice, CEDEFOP) und EU-Datenbanken.
- Nenne 2-3 aktuelle Studien mit Titel, Institut, Jahr und Kernaussage.

2. MESO-EBENE: NATIONALE/REGIONALE LAGE
- Wie stellt sich das Problem auf länderspezifischer Ebene in den beteiligten Partnerländern dar?
- Nutze Daten von nationalen Behörden und Ämtern, um die Relevanz der Qualifikationslücken in den verschiedenen Staaten zu belegen.

3. MIKRO-EBENE: ZIELGRUPPEN-ANALYSE & LOKALER BEDARF
- Wie ist die spezifische Zielgruppe "${state.targetGroup}" vor Ort betroffen?
- Beziehe dich auf konkrete lokale Bedarfe, potenziell eigene Datenerhebungen (Umfragen) oder Erfahrungen aus Vorgängerprojekten.
- Zahlen zur Größe und Betroffenheit der Zielgruppe.

4. POLITISCHER RAHMEN
- Welche EU-Strategien und Initiativen gibt es zu diesem Thema?
- Wie passt das Thema zu den Erasmus+ Prioritäten (Inklusion, Digitalisierung, Green Deal, Demokratische Teilhabe)?

5. SCHLUSSFOLGERUNG
- Die ermittelten Probleme, Bedürfnisse und Lösungen auf Makro-, Meso- und Mikro-Ebene müssen hier logisch miteinander verknüpft werden.
- Warum ist JETZT ein Erasmus+ Projekt zu diesem Thema notwendig?
- Was sind die 3 wichtigsten Bedarfe, die adressiert werden müssen?

Bitte antworte ausführlich und mit konkreten Quellenangaben.`;
  };

  const getBestPracticesPrompt = () => {
    const sectorLabel = SECTORS.find(s => s.value === state.sector)?.label || state.sector;
    const ideaText = state.enhancedIdea || state.idea;
    const problemText = state.enhancedProblem || state.problem;
    return `Du bist ein erfahrener Recherche-Assistent für EU-Bildungsprojekte im Bereich ${sectorLabel}.

AUFGABE: Recherchiere bestehende Projekte, Initiativen und Best Practices zum folgenden Thema.

THEMA / PROJEKTIDEE:
"${ideaText}"

ZIELGRUPPE: ${state.targetGroup}
ERASMUS+ SCHWERPUNKT (PRIORITÄT): ${state.priorityFocus || 'Kein spezifischer Schwerpunkt vorgegeben'}

PROBLEM / HERAUSFORDERUNG:
"${problemText}"

RECHERCHEKRITERIEN:
- Bestehende EU-geförderte Projekte (Erasmus+, ESF, Horizon, Creative Europe etc.)
- Innovative nationale Initiativen in EU-Mitgliedsstaaten
- Nur Projekte und Initiativen der letzten 5 Jahre (2021-2026)
- Konkrete Ergebnisse und Lessons Learned
- Nenne IMMER: Projektname, Förderprogramm, Laufzeit, beteiligte Länder

STRUKTUR DEINER ANALYSE:

1. BESTEHENDE EU-PROJEKTE
- Welche Erasmus+ oder EU-Projekte gibt es bereits zu diesem Thema?
- Was waren deren Hauptergebnisse und Outputs?
- Was hat gut funktioniert, was nicht?
- Suche konkret in: Erasmus+ Project Results Platform, EPALE, School Education Gateway
- Nenne 5-8 relevante Projekte mit Name, Programm, Jahr und Hauptergebnis

2. NATIONALE BEST PRACTICES
- Welche innovativen Ansätze gibt es in einzelnen EU-Ländern?
- Was können wir davon lernen und übernehmen?
- Nenne 3-5 konkrete Beispiele mit Land und Initiative

3. INNOVATIONSLÜCKE (Gap Analysis)
- Was fehlt bei den bestehenden Ansätzen?
- Welche Aspekte wurden noch NICHT ausreichend adressiert?
- Wo gibt es den größten Bedarf für neue Lösungen?

4. METHODISCHE ANSÄTZE
- Welche Methoden und Ansätze haben sich als besonders wirksam erwiesen?
- Welche didaktischen/pädagogischen Frameworks sind relevant?
- Gibt es technologische Lösungen die eingesetzt wurden?

5. EMPFEHLUNGEN
- Was sollte ein neues Projekt ANDERS oder BESSER machen?
- Welche 3 innovativen Ansätze wären am vielversprechendsten?
- Wie kann das Projekt einen echten Mehrwert gegenüber bestehenden Initiativen schaffen?

Bitte antworte ausführlich und mit konkreten Projektbeispielen.`;
  };

  // ============================================================================
  // STEP 2: Sources Upload & Concept Generation
  // ============================================================================

  const handleSourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const sourceId = `src_${Date.now()}_${i}`;

      // Sofort Platzhalter mit Extraktions-Status anlegen
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
      setState(prev => ({ ...prev, sources: [...prev.sources, newSource] }));

      // Text extrahieren je nach Dateityp
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
        updateSource(sourceId, { content: trimmedContent, isExtracting: false });

        // Auto-Analyse starten
        if (trimmedContent.length > 50) {
          autoAnalyzeSource(sourceId, newSource.title, trimmedContent);
        }
      } catch (err) {
        console.error(`Error extracting ${file.name}:`, err);
        updateSource(sourceId, {
          isExtracting: false,
          error: `Datei konnte nicht gelesen werden: ${ext.toUpperCase()}-Format fehlerhaft`,
        });
      }
    }
    e.target.value = '';
  };

  const addSourceManually = () => {
    const newSource: ResearchSource = {
      id: `src_${Date.now()}`,
      title: '',
      content: '',
      type: 'study',
      isAnalyzed: false,
      isAnalyzing: false,
      isExtracting: false,
    };
    setState(prev => ({
      ...prev,
      sources: [...prev.sources, newSource],
    }));
  };

  const updateSource = (id: string, updates: Partial<ResearchSource>) => {
    setState(prev => ({
      ...prev,
      sources: prev.sources.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  };

  const removeSource = (id: string) => {
    setState(prev => ({
      ...prev,
      sources: prev.sources.filter(s => s.id !== id),
    }));
  };

  const runAnalysis = async (sourceId: string, title: string, content: string) => {
    updateSource(sourceId, { isAnalyzing: true, error: undefined });
    try {
      const prompt = `Analysiere diese Forschungsquelle und extrahiere die wichtigsten Erkenntnisse.

QUELLE: "${title}"

INHALT:
${content.substring(0, 10000)}

Antworte im JSON-Format:
{
  "summary": "Kurze Zusammenfassung (3-4 Sätze)",
  "keyFindings": ["Erkenntnis 1", "Erkenntnis 2", "Erkenntnis 3", "Erkenntnis 4", "Erkenntnis 5"]
}`;

      const response = await generateContentAction(prompt, 'Du bist ein Forschungsanalyst. Antworte NUR im JSON-Format.', 0.7, 45000);
      const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);

      updateSource(sourceId, {
        summary: parsed.summary,
        keyFindings: parsed.keyFindings,
        isAnalyzed: true,
        isAnalyzing: false,
      });
    } catch (e) {
      console.error('Source analysis error:', e);
      updateSource(sourceId, {
        isAnalyzing: false,
        error: 'Analyse fehlgeschlagen. Bitte erneut versuchen.',
      });
    }
  };

  const autoAnalyzeSource = (sourceId: string, title: string, content: string) => {
    runAnalysis(sourceId, title, content);
  };

  const analyzeSource = async (source: ResearchSource) => {
    runAnalysis(source.id, source.title, source.content);
  };

  const generateConcepts = async () => {
    setIsGenerating(true);
    try {
      const sourceContext = state.sources
        .filter(s => s.isAnalyzed)
        .map(s => `QUELLE "${s.title}":\n${s.summary}\nErkenntnisse: ${s.keyFindings?.join('; ')}`)
        .join('\n\n');

      const allSourceContext = state.sources
        .filter(s => !s.isAnalyzed && s.content)
        .map(s => `QUELLE "${s.title}":\n${s.content.substring(0, 1500)}`)
        .join('\n\n');

      const sectorLabel = SECTORS.find(s => s.value === state.sector)?.label || state.sector;

      const isKA210 = state.actionType === 'KA210';
      const ideaText = state.enhancedIdea || state.idea;
      const problemText = state.enhancedProblem || state.problem;

      const ka210Hint = isKA210
        ? `\nWICHTIG - KA210 Rahmenbedingungen:
- Budget: max. 60.000 EUR (Lump Sum)
- Dauer: 6-24 Monate
- Min. 2 Partner aus 2 verschiedenen Ländern
- Fokus auf EINFACHE, umsetzbare Aktivitäten
- Weniger Outputs als bei KA220 (2-3 statt 4-6)
- Keine formalen Work Packages, sondern direkte Aktivitäten
- Ideal für: Austausch von Best Practices, Kapazitätsaufbau, kleine Pilotprojekte`
        : `\nWICHTIG - KA220 Rahmenbedingungen:
- Budget: 120.000-400.000 EUR
- Dauer: 12-36 Monate
- Min. 3 Partner aus 3 verschiedenen Ländern
- Fokus auf transnationale Zusammenarbeit und Innovation
- 3-6 konkrete Outputs/Intellectual Results
- Formale Work Package Struktur mit WP1 Management`;

      const prompt = `Du bist ein erfahrener Erasmus+ Projektentwickler im Bereich ${sectorLabel}.

PROJEKTIDEE: "${ideaText}"
ZIELGRUPPE: ${state.targetGroup}
ERASMUS+ SCHWERPUNKT (PRIORITÄT): ${state.priorityFocus || 'Kein spezifischer Schwerpunkt vorgegeben'}
PROBLEM: "${problemText}"
AKTIONSTYP: ${state.actionType}${isKA210 ? ' (Kleine Partnerschaft)' : ' (Kooperationspartnerschaft)'}
${ka210Hint}

RECHERCHE-ERGEBNISSE:
${sourceContext}
${allSourceContext ? `\nWEITERE QUELLEN:\n${allSourceContext}` : ''}

AUFGABE: Entwickle 3 UNTERSCHIEDLICHE Konzeptvorschläge für ein Erasmus+ ${state.actionType} Projekt.
Jedes Konzept soll einen ANDEREN Ansatz verfolgen, ABER alle Konzepte MÜSSEN den definierten Erasmus+ Schwerpunkt ("${state.priorityFocus || 'Kein spezifischer Schwerpunkt'}") zentral als roter Faden behandeln!

Die Konzepte sollen sich deutlich unterscheiden in:
- Methodischem Ansatz
- Schwerpunkt und Innovation
- Art der Outputs und Ergebnisse

${isKA210 ? 'Halte die Konzepte REALISTISCH für ein kleines Budget (max 60k) und kurze Laufzeit. Weniger ist mehr!' : 'Nutze das größere Budget und die längere Laufzeit für ambitionierte, innovative Ansätze.'}

Nutze die Recherche-Ergebnisse als Grundlage und beziehe dich auf konkrete Daten.

SPRACHE: Antworte grundsätzlich auf ${language === 'de' ? 'Deutsch' : 'Englisch'}. 
WICHTIGE AUSNAHME: Der Projekttitel und das Akronym MÜSSEN ZWINGEND auf Englisch sein, da der finale EU-Antrag auf Englisch eingereicht wird!

AKRONYM-REGEL: Das Akronym MUSS ein kreatives englisches Wort sein, bei dem JEDER Buchstabe für ein Wort aus dem englischen Projekttitel steht.
Beispiele: GAFFE = Generative AI for Female Entrepreneurship, BRIDGE = Building Resilience through Inclusive Digital Growth in Education, LEARN = Leveraging Education for Accessible Resources Network.
Das Akronym soll einprägsam und thematisch passend sein!

Antworte im JSON-Format:
{
  "concepts": [
    {
      "title": "ENGLISCHER Projekttitel (der die Buchstaben des Akronyms enthält)",
      "acronym": "KREATIVES ENGLISCHES Akronym (max 10 Buchstaben, jeder Buchstabe = ein Wort aus dem Titel)",
      "summary": "Zusammenfassung in ${isKA210 ? '3-4' : '4-5'} Sätzen",
      "problemStatement": "Welches spezifische Problem adressiert dieses Konzept? (3-4 Sätze, mit Bezug auf Studien)",
      "innovation": "Was ist der innovative Ansatz? Was ist NEU? (${isKA210 ? '2-3' : '3-4'} Sätze)",
      "targetGroups": ["Zielgruppe 1", "Zielgruppe 2"],
      "objectives": ["Ziel 1", "Ziel 2"${isKA210 ? '' : ', "Ziel 3"'}],
      "mainOutputs": ["Output 1: Beschreibung", "Output 2: Beschreibung"${isKA210 ? '' : ', "Output 3: Beschreibung"'}],
      "erasmusPriorities": ["Welche Erasmus+ Prioritäten werden adressiert"]
    }
  ]
}

WICHTIG: 3 Konzepte, die sich deutlich voneinander unterscheiden!`;

      const response = await generateContentAction(prompt, 'Du bist ein Erasmus+ Projektentwickler. Antworte NUR im JSON-Format. Kein Markdown.', 0.7, 45000);
      const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);

      const concepts: ConceptProposal[] = (parsed.concepts || []).map((c: any, i: number) => ({
        id: `concept_${Date.now()}_${i}`,
        ...c,
        selected: false,
        savedForLater: false,
      }));

      update({ concepts, conceptsGenerated: true });
    } catch (e: any) {
      console.error('Concept generation error:', e);
      update({
        conceptError: e?.message || 'Konzeptgenerierung fehlgeschlagen. Bitte erneut versuchen.',
        conceptsGenerated: false,
      });
    }
    setIsGenerating(false);
  };

  const toggleConceptExpansion = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setState(prev => ({
      ...prev,
      concepts: prev.concepts.map(c =>
        c.id === id ? { ...c, expanded: !c.expanded } : c
      )
    }));
  };

  const selectConcept = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setState(prev => ({
      ...prev,
      selectedConceptId: id,
      concepts: prev.concepts.map(c => ({
        ...c,
        selected: c.id === id,
      })),
    }));
  };

  const toggleSaveForLater = (id: string) => {
    setState(prev => ({
      ...prev,
      concepts: prev.concepts.map(c =>
        c.id === id ? { ...c, savedForLater: !c.savedForLater } : c
      ),
    }));
  };

  const compareConcepts = async () => {
    if (state.concepts.length < 2) return;

    update({ isComparingConcepts: true, conceptComparisonResult: null, compareConceptsError: undefined });

    try {
      const isKA210 = state.actionType === 'KA210';
      const sectorLabel = SECTORS.find(s => s.value === state.sector)?.label || state.sector;
      const ideaText = state.enhancedIdea || state.idea;
      const problemText = state.enhancedProblem || state.problem;

      const conceptsContext = state.concepts.map(c => `
ID: ${c.id}
TITEL: ${c.title}
AKRONYM: ${c.acronym}
ZUSAMMENFASSUNG: ${c.summary}
INNOVATION: ${c.innovation}
OUTPUTS: ${c.mainOutputs?.join(', ')}
      `).join('\n\n---\n\n');

      const prompt = `Du bist ein strenger aber konstruktiver Evaluator für Erasmus+ Projektkonzepte im Bereich ${sectorLabel}.

RÜCKBLICK AUF DEN URSPRÜNGLICHEN BEDARF:
Projektidee: "${ideaText}"
Zielgruppe: ${state.targetGroup}
Problem: "${problemText}"
Aktionstyp: ${state.actionType}${isKA210 ? ' (Kleine Partnerschaft, Budget max 60k)' : ' (Kooperationspartnerschaft)'}
Erasmus+ Schwerpunkt/Priorität: ${state.priorityFocus || 'Kein definierter Schwerpunkt'}

ZUR BEWERTUNG VORLIEGENDE KONZEPTE:
${conceptsContext}

AUFGABE: 
Bewerte diese ${state.concepts.length} Erasmus+ Konzepte im direkten Vergleich. 
Welches Konzept hat die besten Chancen auf Förderung und löst das Problem der Zielgruppe am effizientesten im Rahmen des gewählten Aktionstyps?

Kriterien für die Bewertung:
1. Relevanz & Passung zum Problem und zur Zielgruppe
2. Innovationsgrad & Methodik
3. Realisierbarkeit (besonders hinsichtlich des ${state.actionType} Budgets)
4. Integration des definierten Erasmus+ Schwerpunkts

Antworte ZWINGEND im JSON-Format:
{
  "recommendationId": "Die exakte ID des Konzepts, das du am meisten empfiehlst",
  "overallSummary": "Eine zusammenfassende Begründung für deine Wahl in 2-3 klaren Sätzen.",
  "comparisons": [
    {
      "conceptId": "Die exakte ID des bewerteten Konzepts",
      "strengths": ["Stärke 1", "Stärke 2"],
      "weaknesses": ["Schwäche 1 (konstruktiv formuliert)", "Schwäche 2"],
      "improvementTip": "Ein konkreter, kurzer Ratschlag, wie dieses Konzept noch besser werden könnte"
    }
  ]
}`;

      const response = await generateJsonContentAction(prompt, 'Du bist Projekt-Evaluator. Antworte NUR im JSON-Format.', 0.5);
      const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);

      update({ conceptComparisonResult: parsed });
    } catch (e: any) {
      console.error('Concept comparison error:', e);
      update({ compareConceptsError: 'Fehler bei der KI-Bewertung: ' + (e.message || 'Unbekannter Fehler') });
    } finally {
      update({ isComparingConcepts: false });
    }
  };

  // ============================================================================
  // STEP 3: Consortium (Manual Partner Selection)
  // ============================================================================

  const togglePartnerSelection = (partnerId: string) => {
    setState(prev => {
      const isSelected = prev.selectedPartners.some(sp => sp.partnerId === partnerId);
      if (isSelected) {
        return {
          ...prev,
          selectedPartners: prev.selectedPartners.filter(sp => sp.partnerId !== partnerId),
        };
      } else {
        return {
          ...prev,
          selectedPartners: [...prev.selectedPartners, { partnerId, role: 'PARTNER' }],
        };
      }
    });
  };

  const setPartnerRole = (partnerId: string, role: 'COORDINATOR' | 'PARTNER') => {
    setState(prev => ({
      ...prev,
      selectedPartners: prev.selectedPartners.map(sp => {
        if (sp.partnerId === partnerId) {
          return { ...sp, role };
        }
        // If setting as COORDINATOR, make sure no other partner is COORDINATOR
        if (role === 'COORDINATOR' && sp.role === 'COORDINATOR') {
          return { ...sp, role: 'PARTNER' };
        }
        return sp;
      }),
    }));
  };

  const getFilteredPartners = () => {
    const query = state.partnerSearchQuery.toLowerCase().trim();
    if (!query) return partners;
    return partners.filter(p =>
      p.organizationName.toLowerCase().includes(query) ||
      p.country.toLowerCase().includes(query) ||
      p.organizationType.toLowerCase().includes(query) ||
      p.city?.toLowerCase().includes(query) ||
      p.expertiseAreas?.some(e => e.domain.toLowerCase().includes(query)) ||
      p.tags?.some(t => t.toLowerCase().includes(query))
    );
  };

  // ============================================================================
  // STEP 4: Objectives
  // ============================================================================

  const generateObjectives = async () => {
    setIsGenerating(true);
    try {
      const selectedConcept = state.concepts.find(c => c.id === state.selectedConceptId);
      if (!selectedConcept) {
        setIsGenerating(false);
        update({ objectivesError: 'Bitte wähle zuerst ein Konzept in Schritt 2 aus.' });
        return;
      }

      const sourceContext = state.sources
        .filter(s => s.isAnalyzed)
        .map(s => `"${s.title}": ${s.keyFindings?.join('; ')}`)
        .join('\n');

      const isKA210 = state.actionType === 'KA210';
      const objectiveCount = isKA210 ? '2-3' : '3-5';

      const prompt = `Du bist ein Erasmus+ Projektplaner${isKA210 ? ' für Kleine Partnerschaften (KA210)' : ''}.

URSPRÜNGLICHE IDEE DES NUTZERS:
"${state.enhancedIdea || state.idea}"

KONZEPT: "${selectedConcept.title}"
${selectedConcept.summary}

PROBLEM: ${selectedConcept.problemStatement}
INNOVATION: ${selectedConcept.innovation}
AKTIONSTYP: ${state.actionType}${isKA210 ? ' (Budget max. 60k, Dauer max. 24 Monate)' : ''}

RECHERCHE-QUELLEN:
${sourceContext}

AUFGABE: Definiere ${objectiveCount} SMART-Ziele für dieses Projekt.
Jedes Ziel muss:
- Specific, Measurable, Achievable, Relevant, Time-bound sein
- Konkrete Indikatoren haben (Zahlen!)
- Sich auf die Recherche-Quellen beziehen (welche Studie belegt den Bedarf)
- Einer Erasmus+ Priorität zugeordnet sein
${isKA210 ? '- REALISTISCH für ein kleines Budget und kurze Laufzeit sein' : ''}

Antworte im JSON-Format:
{
  "objectives": [
    {
      "text": "SMART-Ziel ausformuliert",
      "indicators": ["Indikator 1 mit Zielwert", "Indikator 2 mit Zielwert"],
      "sources": ["Welche Quelle belegt den Bedarf für dieses Ziel"],
      "erasmusPriority": "Inklusion / Digitalisierung / Nachhaltigkeit / Demokratische Teilhabe"
    }
  ]
}`;

      const response = await generateContentAction(prompt, 'Du bist Projektplaner. Antworte NUR im JSON-Format.', 0.7, 45000);
      const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);

      const objectives: SmartObjective[] = (parsed.objectives || []).map((o: any, i: number) => ({
        id: `obj_${Date.now()}_${i}`,
        ...o,
      }));

      update({ objectives, selectedObjectiveIds: objectives.map(o => o.id), objectivesGenerated: true, objectivesError: undefined });
    } catch (e: any) {
      console.error('Objectives generation error:', e);
      update({ objectivesError: e?.message || 'SMART-Ziele konnten nicht generiert werden. Bitte erneut versuchen.' });
    }
    setIsGenerating(false);
  };

  const regenerateSingleObjective = async (objectiveId: string) => {
    update({ regeneratingObjectiveId: objectiveId, objectivesError: undefined });
    try {
      const selectedConcept = state.concepts.find(c => c.id === state.selectedConceptId);
      if (!selectedConcept) throw new Error("Bitte Konzept auswählen.");

      const sourceContext = state.sources
        .filter(s => s.isAnalyzed)
        .map(s => `"${s.title}": ${s.keyFindings?.join('; ')}`)
        .join('\n');

      const isKA210 = state.actionType === 'KA210';
      const existingObjectivesContext = state.objectives
        .filter(o => o.id !== objectiveId)
        .map((o, i) => `- ${o.text}`)
        .join('\n');

      const prompt = `Du bist ein Erasmus+ Projektplaner.

KONZEPT: "${selectedConcept.title}"
${selectedConcept.summary}
PROBLEM: ${selectedConcept.problemStatement}
INNOVATION: ${selectedConcept.innovation}
AKTIONSTYP: ${state.actionType}

RECHERCHE-QUELLEN:
${sourceContext}

BEREITS VORHANDENE ZIELE (BITTE KEINE DUPLIKATE PRODUZIEREN):
${existingObjectivesContext || 'Keine anderen Ziele verbleibend.'}

AUFGABE: Generiere exakt EIN NEUES SMART-Ziel, das die bestehenden ergänzt und sich thematisch auf die Quellen bezieht.
Es muss Specific, Measurable, Achievable, Relevant und Time-bound sein, konkrete Indikatoren haben und einer Erasmus+ Priorität zugeordnet sein.

Antworte im JSON-Format:
{
  "objective": {
    "text": "Neues SMART-Ziel ausformuliert",
    "indicators": ["Indikator 1", "Indikator 2"],
    "sources": ["Quelle 1"],
    "erasmusPriority": "Priorität"
  }
}`;

      const response = await generateContentAction(prompt, 'Du bist Projektplaner. Antworte NUR im JSON-Format.', 0.7, 30000);
      const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);

      if (!parsed.objective || !parsed.objective.text) {
        throw new Error("Ungültige KI-Antwort.");
      }

      setState(prev => ({
        ...prev,
        regeneratingObjectiveId: null,
        objectives: prev.objectives.map(o =>
          o.id === objectiveId
            ? { ...o, ...parsed.objective }
            : o
        )
      }));
    } catch (e: any) {
      console.error('Single objective generation error:', e);
      update({ objectivesError: e?.message || 'SMART-Ziel konnte nicht neu generiert werden.', regeneratingObjectiveId: null });
    }
  };

  // ============================================================================
  // STEP 5: WP Structure
  // ============================================================================

  const generateWPStructure = async () => {
    setIsGenerating(true);
    try {
      const selectedConcept = state.concepts.find(c => c.id === state.selectedConceptId);
      if (!selectedConcept) {
        setIsGenerating(false);
        update({ wpError: 'Bitte wähle zuerst ein Konzept in Schritt 2 aus.' });
        return;
      }

      const isKA210 = state.actionType === 'KA210';

      const consortiumText = state.selectedPartners.map(sp => {
        const p = partners.find(pp => pp.id === sp.partnerId);
        return p ? `- ${sp.role}: ${p.organizationName} (${p.country}, ${p.organizationType.replace(/_/g, ' ')})` : '';
      }).filter(Boolean).join('\n');

      const prompt = isKA210
        ? `Du bist ein Erasmus+ Projektplaner für Kleine Partnerschaften (KA210).

URSPRÜNGLICHE IDEE DES NUTZERS:
"${state.enhancedIdea || state.idea}"

KONZEPT: "${selectedConcept.title}"
${selectedConcept.summary}

ZIELE:
${state.objectives.filter(o => state.selectedObjectiveIds.includes(o.id)).map((o, i) => `${i + 1}. ${o.text}`).join('\n')}

OUTPUTS:
${selectedConcept.mainOutputs.join('\n')}

KONSORTIUM:
${consortiumText}

RAHMENBEDINGUNGEN KA210:
- Budget: max. 60.000 EUR
- Dauer: max. 24 Monate
- KEINE formalen Work Packages, sondern direkte AKTIVITÄTEN
- Einfache, umsetzbare Struktur

AUFGABE: Erstelle 3-5 Projektaktivitäten für dieses KA210 Projekt.
Jede Aktivität soll:
- Einen klaren Zweck und Inhalt haben
- 2-3 konkrete Teilschritte beinhalten
- 1-2 Ergebnisse/Outputs liefern
- Einem Partner zugeordnet sein
- Einen realistischen Zeitrahmen haben

Antworte im JSON-Format:
{
  "workPackages": [
    {
      "number": 1,
      "title": "Titel der Aktivität",
      "type": "ACTIVITY",
      "description": "Beschreibung der Aktivität (2-3 Sätze)",
      "activities": ["Teilschritt 1", "Teilschritt 2"],
      "deliverables": ["Ergebnis 1"],
      "duration": { "start": 1, "end": 6 },
      "lead": "Welcher Partner führt diese Aktivität"
    }
  ]
}

WICHTIG: Halte es einfach und realistisch für ein kleines Budget!`
        : `Du bist ein Erasmus+ Work Package Experte.

URSPRÜNGLICHE IDEE DES NUTZERS:
"${state.enhancedIdea || state.idea}"

KONZEPT: "${selectedConcept.title}"
${selectedConcept.summary}

ZIELE:
${state.objectives.filter(o => state.selectedObjectiveIds.includes(o.id)).map((o, i) => `${i + 1}. ${o.text}`).join('\n')}

OUTPUTS:
${selectedConcept.mainOutputs.join('\n')}

KONSORTIUM:
${consortiumText}

AUFGABE: Erstelle eine logische WP-Struktur (4-5 Work Packages + WP1 Management).
Jedes WP soll:
- Einen klaren Zweck haben
- 2-3 konkrete Aktivitäten beinhalten
- 2-3 Deliverables haben
- Einem Konsortium-Partner zugeordnet sein
- Einen realistischen Zeitrahmen haben

Antworte im JSON-Format:
{
  "workPackages": [
    {
      "number": 1,
      "title": "Project Management & Quality Assurance",
      "type": "MANAGEMENT",
      "description": "Beschreibung des WP (3-4 Sätze)",
      "activities": ["Aktivität 1", "Aktivität 2"],
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "duration": { "start": 1, "end": 24 },
      "lead": "Welcher Partnertyp führt dieses WP"
    }
  ]
}

Stelle sicher dass WP1 immer Management ist und das letzte WP Dissemination.`;

      const response = await generateContentAction(prompt, 'Du bist WP-Experte. Antworte NUR im JSON-Format.', 0.7, 45000);
      const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);

      const workPackages = parsed.workPackages || [];
      update({
        wpSuggestions: workPackages,
        selectedWpNumbers: workPackages.map((wp: WPSuggestion) => wp.number),
        wpGenerated: true,
      });
    } catch (e: any) {
      console.error('WP generation error:', e);
      update({
        wpError: e?.message || 'WP-Struktur konnte nicht generiert werden. Bitte erneut versuchen.',
        wpGenerated: false,
      });
    }
    setIsGenerating(false);
  };

  const generateDetailedConcept = async () => {
    update({ isGeneratingDetailedConcept: true, detailedConceptError: undefined });
    try {
      const selectedConcept = state.concepts.find(c => c.id === state.selectedConceptId);
      if (!selectedConcept) throw new Error("Kein Konzept ausgewählt.");

      const isKA210 = state.actionType === 'KA210';
      const sectorLabel = SECTORS.find(s => s.value === state.sector)?.label || state.sector;

      const consortiumText = state.selectedPartners.map(sp => {
        const p = partners.find(pp => pp.id === sp.partnerId);
        return p ? `- ${sp.role}: ${p.organizationName} (${p.country}) - Expertise: ${p.expertiseAreas?.slice(0, 3).map(e => e.domain).join(', ')}` : '';
      }).filter(Boolean).join('\n');

      const sourceContext = state.sources
        .filter(s => s.isAnalyzed)
        .map(s => `"${s.title}": ${s.summary}\nErkenntnisse: ${s.keyFindings?.join('; ')}`)
        .join('\n\n');

      const objectivesText = state.objectives
        .filter(o => state.selectedObjectiveIds.includes(o.id))
        .map((o, i) => `${i + 1}. ${o.text} (Priorität: ${o.erasmusPriority || 'Keine'})`)
        .join('\n');

      const wpText = state.wpSuggestions
        .filter(wp => state.selectedWpNumbers.includes(wp.number))
        .map(wp => `${isKA210 ? 'Aktivität' : 'WP'}${wp.number}: ${wp.title} (${wp.lead})\n${wp.description}\nErgebnisse: ${wp.deliverables.join(', ')}`)
        .join('\n\n');

      const prompt = `Du bist ein hochqualifizierter Erasmus+ Förderantrags-Autor. Entwickle einen überzeugenden, in sich konsistenten und detaillierten Konzeptentwurf (2-3 Seiten Fließtext und strukturierte Absätze) in Markdown-Format.

PROJEKT: "${selectedConcept.title}" (${selectedConcept.acronym})
SEKTOR: ${sectorLabel}
AKTIONSTYP: ${state.actionType}
INNOVATION: ${selectedConcept.innovation}

ZIELE: 
${objectivesText}

KONSORTIUM (WARUM WIR DIE RICHTIGEN SIND):
${consortiumText}

FORSCHUNGSERGEBNISSE (DER BEDARF):
${sourceContext}

STRUKTUR/ARBEITSPAKETE:
${wpText}

AUFGABE:
Schreibe einen detaillierten Konzeptentwurf, der als Grundlage für den späteren EU-Förderantrag dient. Das Dokument muss professionell strukturiert sein und folgende Abschnitte enthalten:

# 1. Relevanz & Bedarf (Needs Analysis)
Verwende hier konkrete Bezugnahmen auf die Forschungsergebnisse/Studien, um den dringenden Bedarf zu untermauern. Warum ist dieses Projekt JETZT nötig?

# 2. Ansatz & Innovation (Proposed Solution)
Wie löst das Projekt das Problem? Was ist der innovative Kern?

# 3. Konsortium & Partnerschaft
Beschreibe kurz die komplementäre Expertise der Partner. Warum bilden gerade diese Organisationen das perfekte Team für dieses Projekt? (Greife die Expertise aus dem Prompt auf).

# 4. Methodik & Arbeitsplan
Fasse die geplante Umsetzung (Aktivitäten/Work Packages) verständlich zusammen. Wie greifen die Bausteine ineinander?

# 5. Erwartete Wirkung (Impact)
Welche nachhaltigen Veränderungen werden bei den Zielgruppen erreicht, auch über die Projektlaufzeit hinaus?

REGELN FÜR DIE AUSGABE:
- Ausschließlich Markdown (kein JSON!)
- Keine Einleitungen wie "Hier ist dein Konzept:"
- Fachlich fundierte und überzeugende Sprache
- Mindestens 800-1000 Wörter (2-3 Seiten).
- Beziehe explizit die mitgelieferten Studienerkenntnisse (Daten/Zitate) und die Spezifika der Partner ein.`;

      const response = await generateContentAction(prompt, 'Du bist ein erfahrener Erasmus+ Grant Writer. Antworte NUR im Markdown-Format.', 0.7, 60000);

      let finalMarkdown = response;
      if (finalMarkdown.startsWith('\`\`\`markdown')) {
        finalMarkdown = finalMarkdown.replace(/^\`\`\`markdown\n/, '').replace(/\n\`\`\`$/, '');
      }

      update({ detailedConcept: finalMarkdown.trim(), isGeneratingDetailedConcept: false });
    } catch (e: any) {
      console.error('Detailed concept generation error:', e);
      update({
        detailedConceptError: e?.message || 'Generierung fehlgeschlagen. Bitte erneut versuchen.',
        isGeneratingDetailedConcept: false,
      });
    }
  };

  const translateConcept = async () => {
    if (!state.detailedConcept) return;

    update({ isTranslatingConcept: true, detailedConceptError: undefined });
    try {
      const prompt = `Du bist ein professioneller Übersetzer für EU-Fördermittelanträge (Erasmus+). 
Deine Aufgabe ist es, den folgenden Konzeptentwurf vom Deutschen in ein professionelles, formelles und überzeugendes britisches Englisch zu übersetzen.
Achte darauf, dass Erasmus+ spezifische Fachbegriffe (z.B. "Work Package", "Deliverables", "Target Group", "Dissemination") korrekt verwendet werden.
Erhalte die Markdown-Formatierung strikt bei. Gib mir AUSSCHLIESSLICH den übersetzten Text zurück, keinen Kommentar davor oder danach.

KONZEPT-ENTWURF:
${state.detailedConcept}`;

      const response = await generateContentAction(prompt, 'Du bist ein Erasmus+ Übersetzungs-Experte. Antworte NUR im Markdown-Format.', 0.2, 60000);

      let finalMarkdown = response;
      if (finalMarkdown.startsWith('\`\`\`markdown')) {
        finalMarkdown = finalMarkdown.replace(/^\`\`\`markdown\n/, '').replace(/\n\`\`\`$/, '');
      }

      update({ detailedConcept: finalMarkdown.trim(), isTranslatingConcept: false });
    } catch (e: any) {
      console.error('Translation error:', e);
      update({
        detailedConceptError: e?.message || 'Übersetzung fehlgeschlagen. Bitte erneut versuchen.',
        isTranslatingConcept: false,
      });
    }
  };

  const exportToPDF = () => {
    const printContent = document.getElementById('pdf-print-area');
    if (!printContent) return;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      const selectedConcept = state.concepts.find(c => c.id === state.selectedConceptId);

      // Get all styles from the parent document
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(style => style.outerHTML)
        .join('\\n');

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${selectedConcept?.title || 'Konzept'} - Erasmus+</title>
            ${styles}
            <style>
              body { 
                background: white !important;
                padding: 40px !important; 
                max-width: 900px;
                margin: 0 auto;
              }
              .prose { 
                max-width: none !important; 
                color: #334155 !important;
              }
              .prose h1, .prose h2, .prose h3 {
                color: #0f172a !important;
                margin-top: 2em !important;
              }
              .pdf-header {
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 1.5rem;
                margin-bottom: 2rem;
              }
              .pdf-intro {
                background-color: #f8fafc;
                border-left: 4px solid #2563eb;
                padding: 1.25rem 1.5rem;
                border-radius: 0.5rem;
                margin-bottom: 2.5rem;
              }
              .pdf-intro p {
                margin: 0;
                color: #475569;
                font-size: 1.05rem;
                line-height: 1.6;
              }
              @media print {
                body { padding: 0 !important; }
                @page { margin: 2cm; }
                .pdf-intro {
                  print-color-adjust: exact;
                  -webkit-print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            <div class="pdf-header">
              <div class="text-xs font-bold tracking-wider text-blue-600 uppercase mb-2">Erasmus+ Projektkonzept</div>
              <h1 class="text-4xl font-extrabold text-slate-900 leading-tight mb-4">${selectedConcept?.title || ''}</h1>
              <div class="flex items-center gap-4 text-sm font-medium text-slate-500 font-mono">
                <span class="bg-slate-100 px-3 py-1 rounded-md text-slate-700">${selectedConcept?.acronym || 'Kein Akronym'}</span>
                <span>•</span>
                <span>${state.actionType}</span>
                <span>•</span>
                <span>${SECTORS.find(s => s.value === state.sector)?.label || ''}</span>
              </div>
            </div>

            <div class="pdf-intro">
              <p>
                <strong>Hinweis:</strong> Dieses Dokument ist ein automatisch generierter, vorläufiger Konzeptentwurf für einen Erasmus+ Förderantrag. Es bietet eine strukturierte Zusammenfassung der Problemstellung, der Projektziele, der geplanten Umsetzungsschritte sowie der vorgesehenen Rollen der Partnerorganisationen und dient als Diskussionsgrundlage für das Projektkonsortium.
              </p>
            </div>

            <div class="prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-600">
              ${printContent.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 2000);
      }, 800);
    }
  };

  // ============================================================================
  // STEP 6: Export to Pipeline
  // ============================================================================

  const exportToPipeline = () => {
    const selectedConcept = state.concepts.find(c => c.id === state.selectedConceptId);
    if (!selectedConcept) return;

    const projectData: any = {
      title: selectedConcept.title,
      acronym: selectedConcept.acronym,
      status: 'DRAFT',
      actionType: state.actionType as any,
      sector: state.sector as any,
      budgetTier: state.actionType === 'KA220' ? 250000 : 60000,
      duration: state.actionType === 'KA210' ? 12 : 24,
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
      objectives: state.objectives
        .filter(o => state.selectedObjectiveIds.includes(o.id))
        .map((o, idx) => ({
          id: `obj_${idx}`,
          code: `SO${idx + 1}`,
          type: 'SPECIFIC' as const,
          description: o.text,
          indicators: o.indicators,
        })),
      consortium: state.selectedPartners.map(sp => ({
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
        partnerIds: state.selectedPartners.map(sp => sp.partnerId),
        initialIdea: state.idea,
        sector: state.sector as any,
        actionType: state.actionType as any,
        title: selectedConcept.title,
        acronym: selectedConcept.acronym,
        priority: selectedConcept.erasmusPriorities?.[0] || '',
        problemStatement: selectedConcept.problemStatement,
        innovation: selectedConcept.innovation,
        workPackages: state.wpSuggestions
          .filter(wp => state.selectedWpNumbers.includes(wp.number))
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
        consortiumFit: state.selectedPartners.map(sp => {
          const p = partners.find(pp => pp.id === sp.partnerId);
          return p ? `${sp.role}: ${p.organizationName} (${p.country})` : '';
        }).filter(Boolean).join('; '),
        studyReferences: state.sources.map(s => ({
          title: s.title,
          url: '',
          snippet: s.summary || '',
        })),
        objectives: state.objectives
          .filter(o => state.selectedObjectiveIds.includes(o.id))
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

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const selectedConcept = state.concepts.find(c => c.id === state.selectedConceptId);

  const canProceed = (step: number) => {
    switch (step) {
      case 1: return state.idea.trim().length > 10 && state.targetGroup.trim().length > 0 && state.problem.trim().length > 10;
      case 2: return state.selectedConceptId !== null;
      case 3: return state.selectedPartners.length > 0;
      case 4: return state.objectives.filter(o => state.selectedObjectiveIds.includes(o.id)).length > 0;
      case 5: return state.wpSuggestions.filter(wp => state.selectedWpNumbers.includes(wp.number)).length > 0;
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
              disabled={!state.idea.trim()}
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
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Schritt 1: Deine Projektidee
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Beschreibe deine Idee grob - daraus generieren wir Recherche-Prompts für eine fundierte Bedarfsanalyse.
              </p>
            </div>

            {/* Sector & Action Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sektor</label>
                <select
                  value={state.sector}
                  onChange={e => update({ sector: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {SECTORS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Aktionstyp</label>
                <select
                  value={state.actionType}
                  onChange={e => update({ actionType: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="KA220">KA220 - Kooperationspartnerschaft</option>
                  <option value="KA210">KA210 - Kleine Partnerschaft</option>
                </select>
              </div>
            </div>

            {/* Erasmus+ Priority Focus */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Erasmus+ Schwerpunkt (Priorität)</label>
              <select
                value={state.priorityFocus || ''}
                onChange={e => update({ priorityFocus: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {ERASMUS_PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              {state.priorityFocus === 'Anderes' && (
                <Input
                  className="mt-2"
                  placeholder="Bitte eigenen Schwerpunkt eintragen..."
                  onChange={e => update({ priorityFocus: e.target.value })}
                  autoFocus
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {language === 'de' ? 'Budget (€)' : 'Budget (€)'}
                </label>
                <Input
                  type="number"
                  value={state.budgetTier || (state.actionType === 'KA220' ? 250000 : 60000)}
                  onChange={e => update({ budgetTier: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {language === 'de' ? 'Dauer (Monate)' : 'Duration (Months)'}
                </label>
                <Input
                  type="number"
                  value={state.duration || (state.actionType === 'KA210' ? 12 : 24)}
                  onChange={e => update({ duration: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Idea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Projektidee - schreib einfach drauf los
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleRecording}
                  className={`h-8 px-2 flex items-center gap-1.5 transition-colors ${isRecording
                    ? 'text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700'
                    : 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
                    }`}
                >
                  {isRecording ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      <MicOff className="h-4 w-4" />
                      <span className="text-xs font-medium">Aufnahme stoppen</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      <span className="text-xs font-medium">Diktieren</span>
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                value={state.idea}
                onChange={e => update({ idea: e.target.value, isEnhanced: false, enhancedIdea: '', enhancedProblem: '' })}
                placeholder={isRecording ? "Höre zu..." : "z.B. Irgendwas mit KI und Erwachsenenbildung, vielleicht ein Toolkit oder so, damit die Leute endlich KI im Unterricht nutzen können..."}
                className={`min-h-[100px] transition-all ${isRecording ? 'border-red-300 ring-2 ring-red-100 bg-red-50/10' : ''}`}
              />
              {isRecording && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Sprich deine Idee einfach ein. Die KI formuliert es danach professionell für dich um.
                </p>
              )}
            </div>

            {/* Target Group */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Zielgruppe
              </label>
              <Input
                value={state.targetGroup}
                onChange={e => update({ targetGroup: e.target.value })}
                placeholder="z.B. Erwachsenenbildner, Trainer, Lehrende in der Weiterbildung"
              />
            </div>

            {/* Problem */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Welches Problem soll gelöst werden?
              </label>
              <Textarea
                value={state.problem}
                onChange={e => update({ problem: e.target.value, isEnhanced: false, enhancedIdea: '', enhancedProblem: '' })}
                placeholder="z.B. Die meisten Erwachsenenbildner haben keine Ahnung von KI und trauen sich da nicht ran..."
                className="min-h-[100px]"
              />
            </div>

            {/* Enhance Button */}
            {state.idea.trim().length > 10 && state.targetGroup.trim().length > 0 && state.problem.trim().length > 10 && !state.isEnhanced && (
              <Button
                onClick={enhanceIdea}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white h-12 text-base"
              >
                {isGenerating ? (
                  <><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Idee wird aufbereitet...</>
                ) : (
                  <><Sparkles className="h-5 w-5 mr-2" /> Idee aufbereiten &amp; optimieren</>
                )}
              </Button>
            )}

            {/* Enhanced Preview */}
            {state.isEnhanced && state.enhancedIdea && (
              <div className="space-y-4 pt-2">
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-violet-900 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Aufbereitete Projektidee
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => update({ isEnhanced: false, enhancedIdea: '', enhancedProblem: '' })}
                      className="text-violet-500 hover:text-violet-700 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Neu aufbereiten
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-semibold text-violet-600 uppercase">Projektidee</span>
                      <p className="text-sm text-gray-800 mt-1 leading-relaxed">{state.enhancedIdea}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-violet-600 uppercase">Problemstellung</span>
                      <p className="text-sm text-gray-800 mt-1 leading-relaxed">{state.enhancedProblem}</p>
                    </div>
                  </div>
                  <p className="text-xs text-violet-500 mt-3 italic">
                    Diese aufbereitete Version wird in den Recherche-Prompts verwendet. Deine Originaltexte bleiben erhalten.
                  </p>
                </div>
              </div>
            )}

            {/* Generate Prompts Button */}
            {state.idea && state.targetGroup && state.problem && state.isEnhanced && (
              <Button
                onClick={generateResearchPrompts}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white h-12 text-base"
              >
                <Search className="h-5 w-5 mr-2" />
                Research-Prompts generieren
              </Button>
            )}

            {/* Research Prompts */}
            {state.researchPromptsGenerated && (
              <div className="space-y-6 pt-4 border-t">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-2">
                    <Search className="h-5 w-5" />
                    Deine Research-Prompts
                  </h3>
                  <p className="text-sm text-amber-700">
                    Kopiere diese Prompts und verwende sie in Perplexity, ChatGPT oder einem anderen Research-Tool.
                    Lade die Ergebnisse anschließend in Schritt 2 hoch.
                  </p>
                </div>

                {/* Prompt 1: Bedarfsanalyse */}
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-blue-50 px-4 py-3 flex items-center justify-between border-b">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">1</div>
                      <div>
                        <h4 className="font-bold text-blue-900">Bedarfsanalyse & Datenlage</h4>
                        <p className="text-xs text-blue-600">Studien, Statistiken, EU-Daten</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getBedarfsanalysePrompt())}
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Kopieren
                    </Button>
                  </div>
                  <div className="p-4 bg-gray-50 max-h-[300px] overflow-y-auto">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                      {getBedarfsanalysePrompt()}
                    </pre>
                  </div>
                </div>

                {/* Prompt 2: Best Practices */}
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-purple-50 px-4 py-3 flex items-center justify-between border-b">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">2</div>
                      <div>
                        <h4 className="font-bold text-purple-900">Best Practices & Innovationslücke</h4>
                        <p className="text-xs text-purple-600">Bestehende Projekte, Gap Analysis</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getBestPracticesPrompt())}
                      className="border-purple-300 text-purple-700 hover:bg-purple-100"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Kopieren
                    </Button>
                  </div>
                  <div className="p-4 bg-gray-50 max-h-[300px] overflow-y-auto">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                      {getBestPracticesPrompt()}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================== STEP 2: SOURCES & CONCEPTS ======================== */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-blue-500" />
                Schritt 2: Quellen hochladen & Konzepte generieren
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Lade deine Recherche-Ergebnisse hoch. Daraus werden 3 unterschiedliche Konzeptvorschläge generiert.
              </p>
            </div>

            {/* Source Upload */}
            <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 bg-blue-50/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-500" />
                  Quellen ({state.sources.length})
                </h3>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept=".txt,.md,.pdf,.docx,.doc"
                      onChange={handleSourceUpload}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Dateien hochladen
                    </span>
                  </label>
                  <Button variant="outline" size="sm" onClick={addSourceManually}>
                    <Plus className="h-4 w-4 mr-1" />
                    Manuell hinzufügen
                  </Button>
                </div>
              </div>

              {state.sources.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Noch keine Quellen. Lade deine Recherche-Ergebnisse als PDF, DOCX oder TXT hoch,
                  oder füge sie manuell per Copy-Paste hinzu. Die Analyse startet automatisch.
                </p>
              ) : (
                <div className="space-y-3">
                  {state.sources.map(source => (
                    <div key={source.id} className={`bg-white rounded-lg border p-4 ${source.isAnalyzed ? 'border-green-300' :
                      source.error ? 'border-red-300' :
                        (source.isExtracting || source.isAnalyzing) ? 'border-blue-300' :
                          'border-gray-200'
                      }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Input
                              value={source.title}
                              onChange={e => updateSource(source.id, { title: e.target.value })}
                              placeholder="Titel der Quelle..."
                              className="font-semibold"
                            />
                            {source.fileType && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full uppercase shrink-0">
                                {source.fileType}
                              </span>
                            )}
                          </div>

                          {/* Extrahierung läuft */}
                          {source.isExtracting && (
                            <div className="flex items-center gap-2 text-blue-600 text-sm py-2">
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Text wird aus {source.fileType?.toUpperCase() || 'Datei'} extrahiert...
                            </div>
                          )}

                          {/* Fehler */}
                          {source.error && (
                            <div className="bg-red-50 rounded-lg p-3 mb-2">
                              <div className="flex items-center gap-2 text-red-700 text-sm">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span>{source.error}</span>
                              </div>
                              {source.content && (
                                <Button
                                  size="sm"
                                  onClick={() => analyzeSource(source)}
                                  className="mt-2 bg-red-600 hover:bg-red-700 text-white"
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Erneut versuchen
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Manueller Paste-Bereich (nur für manuell hinzugefügte ohne Content) */}
                          {!source.content && !source.isExtracting && !source.error && (
                            <Textarea
                              value={source.content}
                              onChange={e => updateSource(source.id, { content: e.target.value })}
                              placeholder="Füge hier den Inhalt der Recherche ein (Copy-Paste)..."
                              className="min-h-[100px] text-sm"
                            />
                          )}

                          {/* Analyse läuft */}
                          {source.isAnalyzing && (
                            <div className="flex items-center gap-2 text-blue-600 text-sm py-2">
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Quelle wird analysiert...
                              <span className="text-xs text-gray-400">({source.content.length.toLocaleString()} Zeichen)</span>
                            </div>
                          )}

                          {/* Content da, aber noch nicht analysiert und nicht gerade analysierend */}
                          {source.content && !source.isAnalyzed && !source.isAnalyzing && !source.error && !source.isExtracting && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{source.content.length.toLocaleString()} Zeichen</span>
                              <Button
                                size="sm"
                                onClick={() => analyzeSource(source)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                Analysieren
                              </Button>
                            </div>
                          )}

                          {/* Analysiert */}
                          {source.isAnalyzed && (
                            <div className="mt-2 bg-green-50 rounded-lg p-3">
                              <div className="flex items-center gap-1 text-green-700 text-xs font-semibold mb-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Analysiert
                                <span className="text-gray-400 font-normal ml-1">({source.content.length.toLocaleString()} Zeichen)</span>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">{source.summary}</p>
                              {source.keyFindings && (
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {source.keyFindings.map((f, i) => (
                                    <li key={i} className="flex items-start gap-1">
                                      <span className="text-green-500 mt-0.5">-</span>
                                      <span>{f}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeSource(source.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generate Concepts */}
            {state.sources.length > 0 && (
              <Button
                onClick={() => { update({ conceptError: undefined }); generateConcepts(); }}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white h-12 text-base"
              >
                {isGenerating ? (
                  <><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Konzepte werden generiert...</>
                ) : (
                  <><Sparkles className="h-5 w-5 mr-2" /> 3 Konzeptvorschläge generieren</>
                )}
              </Button>
            )}

            {/* Error Message */}
            {state.conceptError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                <span>Fehler: {state.conceptError}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { update({ conceptError: undefined }); generateConcepts(); }}
                  className="ml-auto text-red-600 hover:text-red-800"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Erneut
                </Button>
              </div>
            )}

            {/* Concept Proposals */}
            {state.concepts.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-bold text-gray-900">Wähle ein Konzept aus:</h3>
                {state.concepts.map((concept, i) => {
                  const colors = ['from-blue-500 to-blue-600', 'from-purple-500 to-purple-600', 'from-emerald-500 to-emerald-600'];
                  const bgColors = ['bg-blue-50 border-blue-400', 'bg-purple-50 border-purple-400', 'bg-emerald-50 border-emerald-400'];
                  const isExpanded = concept.expanded || concept.selected;

                  return (
                    <div
                      key={concept.id}
                      className={`rounded-xl border-2 overflow-hidden transition-all ${concept.selected
                        ? bgColors[i % 3] + ' shadow-lg ring-2 ring-offset-1 ring-blue-400'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'
                        }`}
                    >
                      {/* Kompakter Header mit Gradient */}
                      <div
                        className={`bg-gradient-to-r ${colors[i % 3]} px-4 py-3 text-white cursor-pointer select-none`}
                        onClick={(e) => toggleConceptExpansion(concept.id, e)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-black tracking-tight">{concept.acronym}</span>
                            <span className="text-white/70 text-sm">|</span>
                            <span className="text-sm text-white/90 font-medium truncate max-w-sm">{concept.title}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSaveConceptToLibrary(concept.id, e); }}
                              className={`p-1.5 rounded-lg ${concept.savedForLater ? 'bg-white/30 text-yellow-200' : 'text-white/50 hover:text-white/80'}`}
                              title={concept.savedForLater ? 'In Bibliothek gespeichert' : 'Für später speichern (Bibliothek)'}
                            >
                              {concept.savedForLater ? (
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              ) : (
                                <Star className="h-4 w-4" fill="none" />
                              )}
                            </button>
                            {concept.selected && (
                              <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full font-semibold">
                                Ausgewählt
                              </span>
                            )}
                            {/* Expand/Collapse chevron */}
                            <button className="text-white/70 hover:text-white ml-2">
                              {isExpanded ? '▲' : '▼'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Kompakter Body */}
                      <div className="px-4 py-3 space-y-4">
                        <div
                          className={`text-sm text-gray-700 cursor-pointer ${isExpanded ? 'whitespace-pre-line' : 'line-clamp-2'}`}
                          onClick={(e) => toggleConceptExpansion(concept.id, e)}
                        >
                          <p className="mb-2"><strong>Problem:</strong> {concept.problemStatement}</p>
                          <p className="mb-2"><strong>Innovation:</strong> {concept.innovation}</p>
                          <p className="mb-2"><strong>Zusammenfassung:</strong> {concept.summary}</p>
                          {isExpanded && (
                            <>
                              <p className="mb-2 font-semibold text-gray-900 mt-4">Warum dieses Konsortium?</p>
                              <p>{concept.consortiumFit}</p>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 items-center">
                          {concept.mainOutputs?.slice(0, 3).map((o, j) => (
                            <span key={j} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {o.length > 40 ? o.substring(0, 40) + '...' : o}
                            </span>
                          ))}
                          {concept.erasmusPriorities?.slice(0, 2).map((p, j) => (
                            <span key={`p${j}`} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                              {p.length > 35 ? p.substring(0, 35) + '...' : p}
                            </span>
                          ))}

                          <div className="flex-1"></div>

                          <Button
                            variant={concept.selected ? "default" : "outline"}
                            size="sm"
                            onClick={(e) => selectConcept(concept.id, e)}
                            className={concept.selected ? "bg-green-600 hover:bg-green-700" : ""}
                          >
                            {concept.selected ? (
                              <><Check className="h-4 w-4 mr-1" /> Ausgewählt</>
                            ) : (
                              'Dieses Konzept wählen'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Concept Comparison UI */}
            {state.concepts.length > 1 && (
              <div className="pt-6 mt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Scale className="h-5 w-5 text-indigo-500" />
                      Konzepte vergleichen & bewerten
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Lass die KI die {state.concepts.length} Konzepte auf Machbarkeit, Innovationsgrad und Passgenauigkeit prüfen.
                    </p>
                  </div>
                  <Button
                    onClick={compareConcepts}
                    disabled={state.isComparingConcepts || isGenerating}
                    variant={state.conceptComparisonResult ? "outline" : "default"}
                    className={!state.conceptComparisonResult ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}
                  >
                    {state.isComparingConcepts ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Analysiert...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> KI-Bewertung starten</>
                    )}
                  </Button>
                </div>

                {state.compareConceptsError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3 mt-4">
                    <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">Bewertung fehlgeschlagen</p>
                      <p className="text-sm mt-1">{state.compareConceptsError}</p>
                    </div>
                  </div>
                )}

                {state.conceptComparisonResult && (
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-5 shadow-sm space-y-6">

                    {/* Overall Recommendation */}
                    <div className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 bg-green-100 p-1.5 rounded-full">
                          <Trophy className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-base">Empfehlung der KI</h4>
                          <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                            {state.conceptComparisonResult.overallSummary}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Individual Comparisons */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {state.conceptComparisonResult.comparisons?.map((comp: any, idx: number) => {
                        const concept = state.concepts.find(c => c.id === comp.conceptId);
                        const isRecommended = comp.conceptId === state.conceptComparisonResult.recommendationId;

                        return (
                          <div
                            key={idx}
                            className={`bg-white rounded-lg p-4 border transition-all ${isRecommended ? 'border-green-400 ring-2 ring-green-100 shadow-md' : 'border-gray-200 shadow-sm'}`}
                          >
                            <div className="flex items-center justify-between mb-3 border-b pb-2">
                              <h5 className="font-bold text-gray-900 truncate pr-2" title={concept?.title || 'Konzept'}>
                                {concept?.acronym || `Konzept ${idx + 1}`}
                              </h5>
                              {isRecommended && (
                                <span className="bg-green-100 text-green-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0">
                                  Favorit
                                </span>
                              )}
                            </div>

                            <div className="space-y-3 test-sm">
                              <div>
                                <h6 className="text-xs font-semibold text-green-700 flex items-center gap-1 mb-1">
                                  <ThumbsUp className="h-3 w-3" /> Stärken
                                </h6>
                                <ul className="text-xs text-gray-700 space-y-1">
                                  {comp.strengths?.map((s: string, i: number) => (
                                    <li key={i} className="flex items-start gap-1">
                                      <span className="text-green-500 mt-0.5">•</span> <span>{s}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div>
                                <h6 className="text-xs font-semibold text-red-700 flex items-center gap-1 mb-1">
                                  <ThumbsDown className="h-3 w-3" /> Schwächen
                                </h6>
                                <ul className="text-xs text-gray-700 space-y-1">
                                  {comp.weaknesses?.map((w: string, i: number) => (
                                    <li key={i} className="flex items-start gap-1">
                                      <span className="text-red-500 mt-0.5">•</span> <span>{w}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="pt-2 border-t mt-3">
                                <h6 className="text-xs font-semibold text-indigo-700 flex items-center gap-1 mb-1">
                                  <Lightbulb className="h-3 w-3" /> Tipp zur Aufwertung
                                </h6>
                                <p className="text-xs text-gray-700 italic">
                                  {comp.improvementTip}
                                </p>
                              </div>
                            </div>

                            <Button
                              variant={concept?.selected ? "default" : "outline"}
                              size="sm"
                              onClick={(e) => {
                                if (comp.conceptId) selectConcept(comp.conceptId, e as any);
                              }}
                              className={`w-full mt-4 ${concept?.selected ? "bg-green-600 hover:bg-green-700" : ""}`}
                            >
                              {concept?.selected ? (
                                <><Check className="h-4 w-4 mr-1" /> Ausgewählt</>
                              ) : (
                                'Dieses wählen'
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================== STEP 3: CONSORTIUM ======================== */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-purple-500" />
                Schritt 3: Konsortium zusammenstellen
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Wähle Partner aus deinem Partnerpool für das Konzept &quot;{selectedConcept?.title}&quot; aus.
              </p>
              <div className={`text-xs rounded-lg px-3 py-2 mb-2 ${state.actionType === 'KA210'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                {state.actionType === 'KA210'
                  ? '📋 KA210: Mindestens 2 Partner aus 2 verschiedenen Ländern'
                  : '📋 KA220: Mindestens 3 Partner aus 3 verschiedenen Ländern'}
              </div>
            </div>

            {partners.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
                <h3 className="font-bold text-amber-900 mb-2">Keine Partner vorhanden</h3>
                <p className="text-sm text-amber-700 mb-4">
                  Du hast noch keine Partner in deiner Datenbank. Füge zuerst Partner hinzu, um ein Konsortium zusammenzustellen.
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/partners'}
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Zur Partnerverwaltung
                </Button>
              </div>
            ) : (
              <>
                {/* Selected Partners */}
                {state.selectedPartners.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Ausgewählte Partner ({state.selectedPartners.length})
                    </h3>
                    <div className="space-y-2">
                      {state.selectedPartners.map(sp => {
                        const partner = partners.find(p => p.id === sp.partnerId);
                        if (!partner) return null;
                        return (
                          <div key={sp.partnerId} className="flex items-center gap-3 bg-white rounded-lg border border-purple-200 px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-gray-900 text-sm truncate block">{partner.organizationName}</span>
                              <span className="text-xs text-gray-500">{partner.country}{partner.city ? `, ${partner.city}` : ''}</span>
                            </div>
                            <select
                              value={sp.role}
                              onChange={e => setPartnerRole(sp.partnerId, e.target.value as 'COORDINATOR' | 'PARTNER')}
                              className={`text-xs font-bold rounded-full px-3 py-1 border-0 cursor-pointer ${sp.role === 'COORDINATOR'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                              <option value="PARTNER">Partner</option>
                              <option value="COORDINATOR">Koordinator</option>
                            </select>
                            <button
                              onClick={() => togglePartnerSelection(sp.partnerId)}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={state.partnerSearchQuery}
                    onChange={e => update({ partnerSearchQuery: e.target.value })}
                    placeholder="Partner suchen (Name, Land, Typ, Expertise...)"
                    className="pl-10"
                  />
                </div>

                {/* Partner List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {getFilteredPartners().map(partner => {
                    const isSelected = state.selectedPartners.some(sp => sp.partnerId === partner.id);
                    return (
                      <div
                        key={partner.id}
                        onClick={() => togglePartnerSelection(partner.id)}
                        className={`rounded-xl border p-4 cursor-pointer transition-all ${isSelected
                          ? 'border-purple-400 bg-purple-50 shadow-sm'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                            }`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-semibold text-gray-900 text-sm truncate">{partner.organizationName}</h4>
                              <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                                <Globe className="h-3 w-3" />
                                {partner.country}{partner.city ? `, ${partner.city}` : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                {partner.organizationType.replace(/_/g, ' ')}
                              </span>
                              {partner.expertiseAreas?.slice(0, 3).map((e, j) => (
                                <span key={j} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                                  {e.domain.replace(/_/g, ' ')}
                                </span>
                              ))}
                              {(partner.expertiseAreas?.length || 0) > 3 && (
                                <span className="text-xs text-gray-400">+{(partner.expertiseAreas?.length || 0) - 3}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {getFilteredPartners().length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      Keine Partner gefunden für &quot;{state.partnerSearchQuery}&quot;
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ======================== STEP 4: OBJECTIVES ======================== */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-green-500" />
                Schritt 4: SMART-Ziele & Ergebnisse
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Basierend auf deinen Quellen und dem Konzept werden SMART-Ziele definiert, die sich direkt auf deine Recherche beziehen.
              </p>
            </div>

            {!state.objectivesGenerated ? (
              <>
                <Button
                  onClick={() => { update({ objectivesError: undefined }); generateObjectives(); }}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white h-12 text-base"
                >
                  {isGenerating ? (
                    <><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Ziele werden definiert...</>
                  ) : (
                    <><Target className="h-5 w-5 mr-2" /> SMART-Ziele generieren</>
                  )}
                </Button>

                {state.objectivesError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Fehler: {state.objectivesError}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { update({ objectivesError: undefined }); generateObjectives(); }}
                      className="ml-auto text-red-600 hover:text-red-800"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Erneut
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {/* Selection counter */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm text-gray-500">
                    <strong className="text-green-600">{state.selectedObjectiveIds.length}</strong> von {state.objectives.length} Zielen ausgewählt
                  </span>
                  <button
                    onClick={() => update({
                      selectedObjectiveIds: state.selectedObjectiveIds.length === state.objectives.length
                        ? []
                        : state.objectives.map(o => o.id)
                    })}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {state.selectedObjectiveIds.length === state.objectives.length ? 'Alle abwählen' : 'Alle auswählen'}
                  </button>
                </div>

                {state.objectives.map((obj, i) => {
                  const isSelected = state.selectedObjectiveIds.includes(obj.id);
                  return (
                    <div
                      key={obj.id}
                      onClick={() => update({
                        selectedObjectiveIds: isSelected
                          ? state.selectedObjectiveIds.filter(id => id !== obj.id)
                          : [...state.selectedObjectiveIds, obj.id]
                      })}
                      className={`rounded-xl border p-4 cursor-pointer transition-all ${isSelected
                        ? 'border-green-300 bg-green-50/30'
                        : 'border-dashed border-gray-300 opacity-50'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-1 transition-colors ${isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                          }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <Input
                            value={obj.text}
                            onChange={(e) => {
                              const newText = e.target.value;
                              setState(prev => ({
                                ...prev,
                                objectives: prev.objectives.map(o => o.id === obj.id ? { ...o, text: newText } : o)
                              }));
                            }}
                            className="font-semibold text-gray-900 mb-2 w-full bg-transparent border-transparent hover:border-gray-300 focus:border-green-500 transition-colors"
                          />

                          {/* Indicators */}
                          <div className="mb-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Indikatoren</span>
                            <ul className="mt-1 space-y-1">
                              {obj.indicators.map((ind, j) => (
                                <li key={j} className="text-sm text-gray-600 flex items-center gap-1">
                                  <span className="text-green-500 mr-1">-</span>
                                  <Input
                                    value={ind}
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      setState(prev => ({
                                        ...prev,
                                        objectives: prev.objectives.map(o => {
                                          if (o.id === obj.id) {
                                            const newInds = [...o.indicators];
                                            newInds[j] = newVal;
                                            return { ...o, indicators: newInds };
                                          }
                                          return o;
                                        })
                                      }))
                                    }}
                                    className="h-7 text-sm bg-transparent border-transparent hover:border-gray-300 focus:border-green-500 py-0 px-2 flex-1"
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Sources */}
                          {obj.sources && obj.sources.length > 0 && (
                            <div className="mb-2">
                              <span className="text-xs font-semibold text-gray-500 uppercase">Quellenbelege</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {obj.sources.map((src, j) => (
                                  <span key={j} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" /> {src}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Footer (Priority & Actions) */}
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                            <div>
                              {obj.erasmusPriority && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                                  {obj.erasmusPriority}
                                </span>
                              )}
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent toggling selection
                                regenerateSingleObjective(obj.id);
                              }}
                              disabled={state.regeneratingObjectiveId === obj.id || isGenerating}
                              className="h-7 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <RefreshCw className={`h-3 w-3 mr-1.5 ${state.regeneratingObjectiveId === obj.id ? 'animate-spin' : ''}`} />
                              {state.regeneratingObjectiveId === obj.id ? 'Generiert...' : 'Neu generieren'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Button
                  onClick={generateObjectives}
                  variant="outline"
                  disabled={isGenerating}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  Neu generieren
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ======================== STEP 5: WP STRUCTURE ======================== */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Layers className="h-5 w-5 text-orange-500" />
                Schritt 5: {state.actionType === 'KA210' ? 'Aktivitäten-Struktur' : 'Work Package Struktur'}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {state.actionType === 'KA210'
                  ? 'Die Projektaktivitäten, Teilschritte und erwarteten Ergebnisse.'
                  : 'Die logische Struktur der Arbeitspakete, Aktivitäten und Deliverables.'}
              </p>
            </div>

            {!state.wpGenerated ? (
              <>
                <Button
                  onClick={() => { update({ wpError: undefined }); generateWPStructure(); }}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white h-12 text-base"
                >
                  {isGenerating ? (
                    <><RefreshCw className="h-5 w-5 animate-spin mr-2" /> {state.actionType === 'KA210' ? 'Aktivitäten werden erstellt...' : 'WP-Struktur wird erstellt...'}</>
                  ) : (
                    <><Layers className="h-5 w-5 mr-2" /> {state.actionType === 'KA210' ? 'Aktivitäten generieren' : 'WP-Struktur generieren'}</>
                  )}
                </Button>

                {state.wpError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Fehler: {state.wpError}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { update({ wpError: undefined }); generateWPStructure(); }}
                      className="ml-auto text-red-600 hover:text-red-800"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Erneut
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {/* Selection counter */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm text-gray-500">
                    <strong className="text-orange-600">{state.selectedWpNumbers.length}</strong> von {state.wpSuggestions.length} Work Packages/Aktivitäten ausgewählt
                  </span>
                  <button
                    onClick={() => update({
                      selectedWpNumbers: state.selectedWpNumbers.length === state.wpSuggestions.length
                        ? []
                        : state.wpSuggestions.map(wp => wp.number)
                    })}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {state.selectedWpNumbers.length === state.wpSuggestions.length ? 'Alle abwählen' : 'Alle auswählen'}
                  </button>
                </div>

                {state.wpSuggestions.map((wp) => {
                  const isKA210 = state.actionType === 'KA210';
                  const label = isKA210 ? `A${wp.number}` : `WP${wp.number}`;
                  const isSelected = state.selectedWpNumbers.includes(wp.number);

                  return (
                    <div
                      key={wp.number}
                      className={`rounded-xl border p-4 cursor-pointer transition-all ${isSelected
                        ? (!isKA210 && wp.number === 1 ? 'border-amber-300 bg-amber-50' : 'border-orange-300 bg-orange-50/30')
                        : 'border-dashed border-gray-300 opacity-50 bg-gray-50'}`}
                      onClick={() => update({
                        selectedWpNumbers: isSelected
                          ? state.selectedWpNumbers.filter(num => num !== wp.number)
                          : [...state.selectedWpNumbers, wp.number].sort((a, b) => a - b)
                      })}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* Checkbox */}
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>

                          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                            {label}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{wp.title}</h4>
                            <span className="text-xs text-gray-500">M{wp.duration.start}-M{wp.duration.end} | {wp.lead}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">{wp.type}</span>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">{wp.description}</p>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-semibold text-gray-500 uppercase">{isKA210 ? 'Teilschritte' : 'Aktivitäten'}</span>
                          <ul className="mt-1 space-y-0.5">
                            {wp.activities.map((a, j) => (
                              <li key={j} className="text-gray-700 flex items-start gap-1">
                                <span className="text-orange-400">-</span> {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-500 uppercase">{isKA210 ? 'Ergebnisse' : 'Deliverables'}</span>
                          <ul className="mt-1 space-y-0.5">
                            {wp.deliverables.map((d, j) => (
                              <li key={j} className="text-gray-700 flex items-start gap-1">
                                <span className="text-green-400">-</span> {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Button
                  onClick={generateWPStructure}
                  variant="outline"
                  disabled={isGenerating}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  Neu generieren
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ======================== STEP 6: SUMMARY & EXPORT ======================== */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Rocket className="h-5 w-5 text-indigo-500" />
                Schritt 6: Zusammenfassung & Export
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Dein fertiges Konzept auf einen Blick. Übernimm es direkt in die Antrags-Pipeline.
              </p>
            </div>

            {selectedConcept && (
              <div className="space-y-6">
                {/* Concept Summary Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-lg">
                      {selectedConcept.acronym?.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{selectedConcept.title}</h3>
                      <span className="text-sm text-gray-500 font-mono">{selectedConcept.acronym} | {state.actionType} | {SECTORS.find(s => s.value === state.sector)?.label}</span>
                    </div>
                  </div>
                  <p className="text-gray-700">{selectedConcept.summary}</p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{state.sources.length}</div>
                    <div className="text-xs text-gray-500">Quellen</div>
                  </div>
                  <div className="bg-white rounded-xl border p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{state.selectedPartners.length}</div>
                    <div className="text-xs text-gray-500">Partner</div>
                  </div>
                  <div className="bg-white rounded-xl border p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {state.objectives.filter(o => state.selectedObjectiveIds.includes(o.id)).length}
                    </div>
                    <div className="text-xs text-gray-500">Ziele</div>
                  </div>
                  <div className="bg-white rounded-xl border p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {state.wpSuggestions.filter(wp => state.selectedWpNumbers.includes(wp.number)).length}
                    </div>
                    <div className="text-xs text-gray-500">{state.actionType === 'KA210' ? 'Aktivitäten' : 'Work Packages'}</div>
                  </div>
                </div>

                {/* Objectives Summary */}
                <div className="bg-white rounded-xl border p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    Projektziele
                  </h4>
                  <ul className="space-y-2">
                    {state.objectives.filter(o => state.selectedObjectiveIds.includes(o.id)).map((obj, i) => (
                      <li key={obj.id} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                        {obj.text}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* WP / Activities Overview */}
                <div className="bg-white rounded-xl border p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-orange-500" />
                    {state.actionType === 'KA210' ? 'Aktivitäten' : 'Work Packages'}
                  </h4>
                  <div className="space-y-2">
                    {state.wpSuggestions.filter(wp => state.selectedWpNumbers.includes(wp.number)).map(wp => (
                      <div key={wp.number} className="flex items-center gap-3 text-sm">
                        <span className="w-10 h-8 rounded bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                          {state.actionType === 'KA210' ? `A${wp.number}` : `WP${wp.number}`}
                        </span>
                        <span className="text-gray-700 flex-1">{wp.title}</span>
                        <span className="text-gray-400 text-xs">M{wp.duration.start}-M{wp.duration.end}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detailed Concept Generation */}
                <div className="bg-white rounded-xl border p-4 sm:p-6 no-print">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      Detaillierter Konzeptentwurf (2-3 Seiten)
                    </span>
                    {state.detailedConcept && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={translateConcept}
                          disabled={state.isTranslatingConcept}
                          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        >
                          {state.isTranslatingConcept ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Globe className="h-4 w-4 mr-2" />
                          )}
                          Auf Englisch übersetzen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={exportToPDF}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Als PDF speichern
                        </Button>
                      </div>
                    )}
                  </h4>
                  <p className="text-sm text-gray-500 mb-6">
                    Erstelle aus deinen bisherigen Eingaben einen professionellen, zusammenhängenden Rohentwurf deines Konzeptes. Optional kannst du ihn direkt als PDF herunterladen.
                  </p>

                  {!state.detailedConcept ? (
                    <Button
                      onClick={generateDetailedConcept}
                      disabled={state.isGeneratingDetailedConcept}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base"
                    >
                      {state.isGeneratingDetailedConcept ? (
                        <><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Generiere Konzept-Dokument (ca. 30s)...</>
                      ) : (
                        <><Sparkles className="h-5 w-5 mr-2" /> Konzeptentwurf generieren</>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-4 border rounded-xl overflow-hidden bg-gray-50">
                      {state.isGeneratingDetailedConcept && (
                        <div className="bg-blue-50 p-2 text-sm text-blue-700 font-medium flex items-center justify-center gap-2 border-b">
                          <RefreshCw className="h-4 w-4 animate-spin" /> Konzept wird neu generiert...
                        </div>
                      )}

                      <div className="p-6 max-h-[60vh] overflow-y-auto w-full prose prose-sm md:prose-base max-w-none text-gray-800">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {state.detailedConcept}
                        </ReactMarkdown>
                      </div>

                      <div className="p-3 border-t bg-white flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={generateDetailedConcept}
                          disabled={state.isGeneratingDetailedConcept}
                          className="text-gray-500 hover:text-blue-600"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Neu generieren
                        </Button>
                      </div>
                    </div>
                  )}

                  {state.detailedConceptError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                      <XCircle className="h-4 w-4 flex-shrink-0" />
                      <span>Fehler: {state.detailedConceptError}</span>
                    </div>
                  )}
                </div>

                {/* Print area for the iframe export */}
                {state.detailedConcept && (
                  <div id="pdf-print-area" className="hidden">
                    <div className="text-3xl font-bold mb-6 border-b pb-4">{selectedConcept.title}</div>
                    <div className="text-sm text-gray-600 mb-8 font-mono">
                      {selectedConcept.acronym} | {state.actionType} | {SECTORS.find(s => s.value === state.sector)?.label}
                    </div>
                    <div className="prose max-w-none prose-indigo">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {state.detailedConcept}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                <div className="relative flex items-center py-2 no-print">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Bereit für den nächsten Schritt?</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                {/* Export Button - Visually demoted vs the Detailed Concept action */}
                <Button
                  onClick={exportToPipeline}
                  variant="outline"
                  className="w-full text-gray-700 h-14 text-lg border-2 hover:bg-gray-50 no-print"
                >
                  <ArrowRight className="h-5 w-5 mr-2 text-gray-400" />
                  Zur detaillierten Antrags-Entwicklung (Project Generator)
                </Button>
              </div>
            )}
          </div>
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
              disabled={!state.idea.trim()}
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
