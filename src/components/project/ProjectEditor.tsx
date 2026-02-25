"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useLanguageStore } from "@/store/language-store";
import {
  Project,
  ActionType,
  Sector,
  ACTION_TYPE_LABELS,
  SECTOR_LABELS,
} from "@/store/types";
import {
  ArrowLeft,
  Save,
  FileText,
  Users,
  Settings,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Edit3,
  Check,
  X,
  Wand2,
  CheckCircle2,
  Files,
} from "lucide-react";
import { getOfficialPipelineStructure } from "@/lib/official-pipeline-structure";
import { downloadAsHTML, downloadAsPDF } from "@/lib/export-service";
import { generateSingleAnswer, AnswerData } from "@/lib/project-pipeline";
import { formatMarkdownToReact } from "@/lib/markdown-formatter";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { ValidationStatus } from "@/components/features/ValidationStatus";
import { translateProjectContent } from "@/app/actions/translate";
import { Languages } from "lucide-react";

interface ProjectEditorProps {
  projectId?: string;
}

// Tabs: 7 chapters + settings
type EditorTab = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "settings";

export function ProjectEditor({ projectId }: ProjectEditorProps) {
  const router = useRouter();
  const projects = useAppStore((state) => state.projects);
  const updateProject = useAppStore((state) => state.updateProject);
  const partners = useAppStore((state) => state.partners);
  const { language } = useLanguageStore();

  const existingProject = projectId
    ? projects.find((p) => p.id === projectId)
    : null;

  const [activeTab, setActiveTab] = useState<EditorTab>("1");
  const [mounted, setMounted] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  // AI editing state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [generatingQuestionId, setGeneratingQuestionId] = useState<string | null>(null);
  const [improveInstruction, setImproveInstruction] = useState<Record<string, string>>({});
  const [showImproveInput, setShowImproveInput] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
    if (existingProject) {
      const structure = getOfficialPipelineStructure(existingProject.actionType);
      const initial: Record<string, boolean> = {};
      structure.forEach(ch => {
        ch.sections.forEach(s => {
          initial[s.id] = true;
        });
      });
      setExpandedSections(initial);
    }
  }, [existingProject?.actionType]);

  // Get tabs from official structure
  const actionType = existingProject?.actionType || 'KA220';
  const structure = getOfficialPipelineStructure(actionType);
  const tabs = structure.map((chapter) => ({
    id: String(chapter.id) as EditorTab,
    label: `${chapter.id}. ${chapter.title}`,
  }));
  tabs.push({ id: "settings", label: "⚙️ Settings" });

  // Get answer value from generatorState
  const getAnswerValue = (questionId: string): string => {
    const answer = existingProject?.generatorState?.answers?.[questionId];
    if (!answer) return '';
    if (typeof answer === 'string') return answer;
    if (Array.isArray(answer)) return answer.join(', ');
    if (typeof answer === 'object' && 'value' in answer) return (answer as AnswerData).value;
    return '';
  };

  // Update answer in generatorState
  const updateAnswer = (questionId: string, value: string) => {
    if (!existingProject || !projectId) return;

    const newGeneratorState = {
      ...existingProject.generatorState,
      answers: {
        ...(existingProject.generatorState?.answers || {}),
        [questionId]: value,
      },
    };

    updateProject(projectId, { generatorState: newGeneratorState });
  };

  // Handle AI regeneration
  const handleRegenerate = async (questionId: string, chapterId: number, instruction?: string) => {
    if (!existingProject?.generatorState) return;

    setGeneratingQuestionId(questionId);
    try {
      const result = await generateSingleAnswer(
        existingProject.generatorState,
        questionId,
        chapterId,
        language,
        instruction,
        existingProject.originalConcept
      );

      updateAnswer(questionId, typeof result === 'string' ? result : result.value);
    } catch (error) {
      console.error('Regeneration error:', error);
    }
    setGeneratingQuestionId(null);
    setShowImproveInput({ ...showImproveInput, [questionId]: false });
    setImproveInstruction({ ...improveInstruction, [questionId]: '' });
  };

  // Save manual edit
  const handleSaveEdit = (questionId: string) => {
    updateAnswer(questionId, editText);
    setEditingQuestionId(null);
    setEditText("");
  };

  const handleTranslate = async () => {
    if (!existingProject) return;
    if (!confirm(language === 'de' ? 'Das gesamte Projekt wird ins Englische übersetzt. Fortfahren?' : 'Translate entire project to English?')) return;

    setIsTranslating(true);
    try {
      const translatedProject = await translateProjectContent(existingProject);
      updateProject(existingProject.id, translatedProject);
      alert(language === 'de' ? 'Übersetzung abgeschlossen!' : 'Translation complete!');
    } catch (e) {
      console.error(e);
      alert('Translation failed');
    }
    setIsTranslating(false);
  };

  // Start editing
  const handleStartEdit = (questionId: string) => {
    setEditingQuestionId(questionId);
    setEditText(getAnswerValue(questionId));
  };

  // Get consortium partner names
  const getPartnerNames = () => {
    const pIds = existingProject?.consortium?.map(c => c.partnerId) || [];
    return partners.filter(p => pIds.includes(p.id)).map(p => p.acronym || p.organizationName);
  };

  // Render question with AI editing
  const renderQuestion = (question: any, chapterId: number, qIndex: number) => {
    if (question.type === 'info') return null;

    const answerValue = getAnswerValue(question.id);
    const isEditing = editingQuestionId === question.id;
    const isGenerating = generatingQuestionId === question.id;
    const showImprove = showImproveInput[question.id];

    return (
      <div key={question.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
        {/* Question */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <span className="text-[#003399] font-bold text-sm mr-2">Q{qIndex + 1}:</span>
            <span className="text-sm font-medium text-gray-700">{question.text}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {!isEditing && (
              <>
                <button
                  onClick={() => {
                    const textToCopy = getAnswerValue(question.id);
                    if (textToCopy) {
                      navigator.clipboard.writeText(textToCopy);
                      // Visual feedback could be added here, e.g. toast
                      // For now, let's change the icon briefly or rely on user knowing it worked
                      // Or better: use a local state for "copied" feedback per question?
                      // Let's add a simple alert or toast if we had one.
                      // Actually, let's use a small state for "copied" icon
                      const btn = document.getElementById(`copy-btn-${question.id}`);
                      if (btn) {
                        const originalContent = btn.innerHTML;
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                        setTimeout(() => {
                          btn.innerHTML = originalContent;
                        }, 2000);
                      }
                    }
                  }}
                  id={`copy-btn-${question.id}`}
                  className="p-1.5 text-gray-400 hover:text-[#003399] hover:bg-blue-50 rounded"
                  title="In die Zwischenablage kopieren"
                >
                  <Files size={14} />
                </button>
                <button
                  onClick={() => handleStartEdit(question.id)}
                  className="p-1.5 text-gray-400 hover:text-[#003399] hover:bg-blue-50 rounded"
                  title="Bearbeiten"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleRegenerate(question.id, chapterId)}
                  disabled={isGenerating}
                  className="p-1.5 text-gray-400 hover:text-[#003399] hover:bg-blue-50 rounded disabled:opacity-50"
                  title="Neu generieren"
                >
                  <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setShowImproveInput({ ...showImproveInput, [question.id]: !showImprove })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${showImprove
                    ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-200'
                    : 'bg-white border border-purple-200 text-purple-600 hover:bg-purple-50 shadow-sm'
                    }`}
                  title="Mit AI bearbeiten"
                >
                  <Wand2 size={14} />
                  <span>AI Assistent</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* AI Improve Input */}
        {showImprove && !isEditing && (
          <div className="flex gap-2 p-2 bg-purple-50 rounded-lg">
            <input
              type="text"
              value={improveInstruction[question.id] || ''}
              onChange={(e) => setImproveInstruction({ ...improveInstruction, [question.id]: e.target.value })}
              placeholder="z.B. Kürzer, mehr Statistiken, formeller..."
              className="flex-1 px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-purple-300"
            />
            <button
              onClick={() => handleRegenerate(question.id, chapterId, improveInstruction[question.id])}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : 'Verbessern'}
            </button>
          </div>
        )}

        {/* Answer Display / Edit */}
        <div className="pl-6 border-l-2 border-[#FFCC00]">
          {isEditing ? (
            <div className="space-y-2">
              <RichTextEditor
                value={editText}
                onChange={setEditText}
                placeholder="Antwort bearbeiten..."
                minHeight="120px"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveEdit(question.id)}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  <Check size={14} /> Speichern
                </button>
                <button
                  onClick={() => { setEditingQuestionId(null); setEditText(""); }}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-400 text-white text-sm rounded hover:bg-gray-500"
                >
                  <X size={14} /> Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div className={`text-sm ${answerValue ? 'text-gray-600' : 'text-gray-400 italic'}`}>
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  Generiere Antwort...
                </span>
              ) : answerValue ? (
                // Check if content is HTML (from RichTextEditor) or plain text/markdown
                answerValue.includes('<') && answerValue.includes('>') ? (
                  <div dangerouslySetInnerHTML={{ __html: answerValue }} />
                ) : (
                  formatMarkdownToReact(answerValue)
                )
              ) : (
                'Keine Antwort generiert'
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Don't render until mounted
  if (!mounted) return null;

  // No project found
  if (!existingProject) {
    return (
      <div className="text-center py-12">
        <FileText size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-medium text-gray-700">Projekt nicht gefunden</h2>
        <button onClick={() => router.push('/projects')} className="mt-4 text-[#003399] hover:underline">
          Zurück zur Projektliste
        </button>
      </div>
    );
  }

  // No generator data
  const hasGeneratorData = !!existingProject.generatorState;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/projects")}
            className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-tight">
                {existingProject.actionType}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100">
                {SECTOR_LABELS[existingProject.sector]}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {existingProject.acronym || existingProject.title || "Unbenanntes Projekt"}
            </h1>
            <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              Konsortium: <span className="text-gray-700 font-medium">{getPartnerNames().join(', ') || 'Keine Partner'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
          {/* Validation Status */}
          {existingProject.generatorState && (
            <ValidationStatus projectState={existingProject.generatorState} />
          )}

          <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block" />

          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-sm shadow-sm disabled:opacity-50"
            title={language === 'de' ? 'Auf Englisch übersetzen' : 'Translate to English'}
          >
            {isTranslating ? <RefreshCw size={16} className="animate-spin text-blue-600" /> : <Languages size={16} className="text-blue-600" />}
            <span>EN Override</span>
          </button>

          <button
            onClick={() => downloadAsPDF(existingProject)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-sm shadow-sm"
            title="Download PDF"
          >
            <Download size={16} />
            <span>Export</span>
          </button>

          <button
            onClick={() => router.push(`/generator?projectId=${projectId}`)}
            className="flex items-center gap-2 px-4 py-2 bg-[#003399] text-white rounded-lg hover:bg-[#002266] transition-all font-medium text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <ExternalLink size={16} />
            <span>Generator</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 mb-6 sticky top-16 z-30 shadow-sm">
        <div className="flex border-b overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id
                ? "border-[#003399] text-[#003399] bg-blue-50/30"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* No Generator Data Warning */}
          {!hasGeneratorData && activeTab !== "settings" && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed">
              <Sparkles size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Keine Generator-Daten vorhanden</h3>
              <p className="text-gray-500 mb-4">
                Öffne das Projekt im Generator, um Inhalte zu erstellen und zu bearbeiten.
              </p>
              <button
                onClick={() => router.push(`/generator?projectId=${projectId}`)}
                className="px-4 py-2 bg-[#003399] text-white rounded-lg hover:bg-[#002266]"
              >
                Im Generator öffnen
              </button>
            </div>
          )}

          {/* Chapter Content */}
          {hasGeneratorData && activeTab !== "settings" && (() => {
            const structure = getOfficialPipelineStructure(existingProject.actionType);
            const chapter = structure.find(c => String(c.id) === activeTab);
            if (!chapter) return null;

            return (
              <div className="space-y-6">
                {/* Chapter Header */}
                <div className="bg-gradient-to-r from-[#003399] to-[#0055cc] rounded-xl p-4 text-white">
                  <h2 className="text-xl font-bold">{chapter.id}. {chapter.title}</h2>
                </div>

                {/* Sections */}
                {chapter.sections.map((section) => (
                  <div key={section.id} className="border rounded-xl overflow-hidden">
                    {/* Section Header */}
                    <button
                      onClick={() => setExpandedSections({ ...expandedSections, [section.id]: !expandedSections[section.id] })}
                      className="w-full flex items-center justify-between p-4 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <h3 className="font-semibold text-[#003399]">{section.title}</h3>
                      {expandedSections[section.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>

                    {/* Section Content */}
                    {expandedSections[section.id] && (
                      <div className="p-4 space-y-4">
                        {section.questions
                          .filter(q => q.type !== 'info')
                          .map((q, idx) => renderQuestion(q, chapter.id, idx))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-2">Projekteinstellungen</h3>
                <p className="text-sm text-yellow-700">
                  Hier können erweiterte Projekteinstellungen konfiguriert werden.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aktionstyp</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50">{ACTION_TYPE_LABELS[existingProject.actionType]}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sektor</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50">{SECTOR_LABELS[existingProject.sector]}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50">€{existingProject.budgetTier.toLocaleString()}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Laufzeit</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50">{existingProject.duration} Monate</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
