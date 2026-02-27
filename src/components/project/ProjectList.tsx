"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import {
  SECTOR_LABELS,
  ACTION_TYPE_LABELS,
  STATUS_LABELS,
  COUNTRY_NAMES,
} from "@/store/types";
import {
  Plus,
  Search,
  FolderKanban,
  Trash2,
  Edit,
  Users,
  Calendar,
  Euro,
  CheckCircle,
  Clock,
  AlertCircle,
  Target,
  RefreshCw,
  Play,
  Flag,
  StickyNote,
  AlertTriangle,
  FileText,
  Globe,
  Lightbulb,
} from "lucide-react";

const statusIcons = {
  CONCEPT: Lightbulb,
  DRAFT: Clock,
  IN_PROGRESS: Edit,
  READY_FOR_REVIEW: CheckCircle,
  SUBMITTED: CheckCircle,
  APPROVED: CheckCircle,
  REJECTED: AlertCircle,
  ARCHIVED: Clock,
};

const statusColors = {
  CONCEPT: "bg-amber-100 text-amber-700",
  DRAFT: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  READY_FOR_REVIEW: "bg-purple-100 text-purple-700",
  SUBMITTED: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

export function ProjectList() {
  const projects = useAppStore((state) => state.projects);
  const partners = useAppStore((state) => state.partners);
  const deleteProject = useAppStore((state) => state.deleteProject);
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'drafts' ? 'drafts' : 'all';
  const [activeTab, setActiveTab] = useState<'all' | 'drafts'>(initialTab);
  const [search, setSearch] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filteredProjects = projects
    .filter(
      (p) =>
        (p.status as string) !== 'CONCEPT' &&
        (p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.acronym.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const dateA = new Date(a.lastGeneratorUpdate || a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.lastGeneratorUpdate || b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

  const handleDelete = (id: string) => {
    deleteProject(id);
    setShowDeleteConfirm(null);
  };

  const getPartnerName = (partnerId: string) => {
    const partner = partners.find((p) => p.id === partnerId);
    return partner?.acronym || partner?.organizationName || "Unknown";
  };

  const getPartnerWithCountry = (partnerId: string) => {
    const partner = partners.find((p) => p.id === partnerId);
    if (!partner) return null;
    return {
      name: partner.acronym || partner.organizationName,
      country: partner.country,
      countryName: COUNTRY_NAMES[partner.country] || partner.country,
    };
  };

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelativeTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    return d.toLocaleDateString('de-DE');
  };

  const getProjectProgress = (project: typeof projects[0]) => {
    if (!project.generatorState) return { percent: 0, step: 0, totalSteps: 7, answeredCount: 0 };

    const currentStep = project.generatorState.currentStep || 0;
    const totalSteps = 7;
    const answers = project.generatorState.answers || {};
    const answeredCount = Object.values(answers).filter((a: any) => a?.value).length;

    // Combined progress: step progress + answer progress
    const stepProgress = (currentStep / totalSteps) * 50;
    const answerProgress = Math.min((answeredCount / 40) * 50, 50); // Assume ~40 questions

    return {
      percent: Math.round(stepProgress + answerProgress),
      step: currentStep,
      totalSteps,
      answeredCount
    };
  };

  // Draft-specific projects (have generatorState, not yet submitted/archived)
  const draftProjects = projects
    .filter(p =>
      p.generatorState &&
      (p.status as string) !== 'CONCEPT' &&
      (p.status as string) !== 'SUBMITTED' &&
      (p.status as string) !== 'APPROVED' &&
      (p.status as string) !== 'ARCHIVED' &&
      (p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.acronym.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const dateA = new Date(a.lastGeneratorUpdate || a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.lastGeneratorUpdate || b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

  const getDetailedProgress = (project: typeof projects[0]) => {
    if (!project.generatorState) return null;
    const state = project.generatorState;
    const at = state.configuration?.actionType || project.actionType || 'KA220';
    const totalSteps = at === 'KA220' ? 8 : 6;
    const currentStep = state.currentStep || 0;
    const completedWPs = state.workPackages?.length || 0;
    const totalWPs = state.configuration?.wpCount || 5;
    const answers = state.answers || {};
    const answeredCount = Object.values(answers).filter((a: any) =>
      typeof a === 'string' ? a.length > 0 : a?.value?.length > 0
    ).length;

    const stepLabelsDE: Record<number, string> = at === 'KA220' ? {
      0: 'Noch nicht gestartet',
      1: 'Kontext',
      2: 'Organisationen',
      3: 'Relevanz & Ziele',
      4: 'Partnerschaft',
      5: 'Wirkung & Impact',
      6: `Arbeitspakete (${completedWPs}/${totalWPs})`,
      7: 'Zusammenfassung',
      8: 'Finale Evaluierung',
    } : {
      0: 'Noch nicht gestartet',
      1: 'Kontext',
      2: 'Organisationen',
      3: 'Relevanz',
      4: `Aktivitäten (${completedWPs}/${totalWPs})`,
      5: 'Impact & Dissemination',
      6: 'Zusammenfassung',
    };

    const lastFeedback = state.evaluatorFeedback?.slice(-1)[0];

    return {
      currentStep,
      totalSteps,
      percent: Math.round((currentStep / totalSteps) * 100),
      completedWPs,
      totalWPs,
      answeredCount,
      currentStepLabel: stepLabelsDE[currentStep] || `Schritt ${currentStep}`,
      lastScore: lastFeedback?.score,
      actionType: at,
    };
  };

  const getProjectObjective = (project: typeof projects[0]) => {
    // Try to get objective from generator state
    if (project.generatorState?.objectives?.generalObjective) {
      const obj = project.generatorState.objectives.generalObjective;
      return obj.length > 150 ? obj.substring(0, 150) + '...' : obj;
    }
    // Fallback to problem statement
    if (project.problemStatement) {
      return project.problemStatement.length > 150
        ? project.problemStatement.substring(0, 150) + '...'
        : project.problemStatement;
    }
    return null;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500">
            {projects.length} project{projects.length !== 1 ? "s" : ""} in progress
          </p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#003399] text-white rounded-lg hover:bg-[#002266] transition-colors"
        >
          <Plus size={18} />
          New Project
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 border-b">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 rounded-t-lg font-medium text-sm transition-colors ${
            activeTab === 'all'
              ? 'bg-[#003399] text-white'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          Alle Projekte ({filteredProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('drafts')}
          className={`px-4 py-2.5 rounded-t-lg font-medium text-sm transition-colors ${
            activeTab === 'drafts'
              ? 'bg-orange-500 text-white'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          📝 Entwürfe ({draftProjects.length})
        </button>
      </div>

      {/* Drafts Tab */}
      {activeTab === 'drafts' && (
        <>
          {draftProjects.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <div className="text-gray-400 mb-4">
                <FileText size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Entwürfe vorhanden
              </h3>
              <p className="text-gray-500 mb-4">
                Starten Sie einen neuen Antrag im Generator — er wird automatisch hier gespeichert.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draftProjects.map((project) => {
                const progress = getDetailedProgress(project);
                if (!progress) return null;
                const lastUpdate = project.lastGeneratorUpdate || project.updatedAt || project.createdAt;

                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-xl border p-5 hover:shadow-lg transition-all"
                  >
                    {/* Top: Badges */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                        Entwurf
                      </span>
                      <span className="bg-[#003399]/10 text-[#003399] px-2 py-1 rounded-full text-xs font-medium">
                        {ACTION_TYPE_LABELS[project.actionType]}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {getRelativeTime(lastUpdate)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {project.acronym || project.title || 'Untitled'}
                    </h3>
                    {project.acronym && project.title && (
                      <p className="text-sm text-gray-500 mb-3 truncate">{project.title}</p>
                    )}

                    {/* Step Progress Visual */}
                    <div className="mt-3">
                      <div className="flex items-center gap-1 mb-2">
                        {Array.from({ length: progress.totalSteps }, (_, i) => (
                          <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${
                            i + 1 <= progress.currentStep ? 'bg-emerald-500' :
                            i + 1 === progress.currentStep + 1 ? 'bg-orange-400 animate-pulse' :
                            'bg-gray-200'
                          }`} />
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Aktuell: {progress.currentStepLabel}</span>
                        <span>{progress.percent}%</span>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      <div className="bg-gray-50 rounded-lg py-2">
                        <div className="text-lg font-bold text-[#003399]">{progress.answeredCount}</div>
                        <div className="text-[10px] text-gray-500 uppercase">Antworten</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg py-2">
                        <div className="text-lg font-bold text-orange-600">{progress.completedWPs}/{progress.totalWPs}</div>
                        <div className="text-[10px] text-gray-500 uppercase">
                          {progress.actionType === 'KA210' ? 'Aktivitäten' : 'WPs'}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg py-2">
                        <div className="text-lg font-bold text-green-600">{progress.lastScore?.toFixed(1) || '–'}</div>
                        <div className="text-[10px] text-gray-500 uppercase">Score</div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <Link
                        href={`/generator?project=${project.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm transition-colors"
                      >
                        <Play size={16} />
                        Fortsetzen
                      </Link>
                      <button
                        onClick={() => showDeleteConfirm === project.id
                          ? handleDelete(project.id)
                          : setShowDeleteConfirm(project.id)
                        }
                        className={`px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          showDeleteConfirm === project.id
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title={showDeleteConfirm === project.id ? 'Klicken zum Bestätigen' : 'Löschen'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Project List (All tab) */}
      {activeTab === 'all' && filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <div className="text-gray-400 mb-4">
            <FolderKanban size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {search ? "No projects found" : "No projects yet"}
          </h3>
          <p className="text-gray-500 mb-4">
            {search
              ? "Try a different search term"
              : "Create your first Erasmus+ project proposal"}
          </p>
          {!search && (
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#003399] text-white rounded-lg hover:bg-[#002266]"
            >
              <Plus size={18} />
              New Project
            </Link>
          )}
        </div>
      ) : activeTab === 'all' ? (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const StatusIcon = statusIcons[project.status];
            const coordinator = project.consortium.find(
              (m) => m.role === "COORDINATOR"
            );
            const progress = getProjectProgress(project);
            const objective = getProjectObjective(project);
            const lastUpdate = project.lastGeneratorUpdate || project.updatedAt || project.createdAt;

            return (
              <Link
                key={project.id}
                href={`/generator?project=${project.id}`}
                className="block bg-white rounded-xl border p-5 hover:shadow-lg hover:border-[#003399]/30 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Status & Type Badges */}
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status]
                          }`}
                      >
                        <StatusIcon size={12} />
                        {STATUS_LABELS[project.status]}
                      </span>
                      <span className="text-xs bg-[#003399]/10 text-[#003399] px-2 py-1 rounded-full font-medium">
                        {ACTION_TYPE_LABELS[project.actionType]}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {SECTOR_LABELS[project.sector]}
                      </span>
                      {progress.step > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          Schritt {progress.step}/{progress.totalSteps}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {project.acronym || project.title || "Untitled Project"}
                    </h3>
                    {project.acronym && project.title && (
                      <p className="text-gray-500 text-sm mb-2">{project.title}</p>
                    )}

                    {/* Objective Preview */}
                    {objective && (
                      <div className="bg-blue-50 border-l-4 border-[#003399] p-3 mb-3 rounded-r">
                        <div className="flex items-start gap-2">
                          <Target size={14} className="text-[#003399] mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700 italic">{objective}</p>
                        </div>
                      </div>
                    )}

                    {/* Meta Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        <div>
                          <div className="text-xs text-gray-400">Erstellt</div>
                          <div>{formatDateTime(project.createdAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RefreshCw size={14} className="text-gray-400" />
                        <div>
                          <div className="text-xs text-gray-400">Aktualisiert</div>
                          <div>{getRelativeTime(lastUpdate)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Euro size={14} className="text-gray-400" />
                        <div>
                          <div className="text-xs text-gray-400">Budget</div>
                          <div>€{project.budgetTier.toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-400" />
                        <div>
                          <div className="text-xs text-gray-400">Laufzeit</div>
                          <div>{project.duration} Monate</div>
                        </div>
                      </div>
                    </div>

                    {/* Consortium Partners with Countries */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-500 uppercase">Konsortium ({project.consortium.length} Partner)</span>
                      </div>
                      {project.consortium.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {project.consortium.map((member) => {
                            const partnerInfo = getPartnerWithCountry(member.partnerId);
                            if (!partnerInfo) return null;
                            return (
                              <span
                                key={member.partnerId}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
                                  member.role === 'COORDINATOR'
                                    ? 'bg-[#003399] text-white'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                <Flag size={10} />
                                {partnerInfo.name}
                                <span className="opacity-70">({partnerInfo.countryName})</span>
                                {member.role === 'COORDINATOR' && (
                                  <span className="ml-1 text-[10px] bg-white/20 px-1 rounded">Koordinator</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Noch keine Partner zugewiesen</span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span className="flex items-center gap-1">
                          <Play size={10} />
                          Fortschritt
                        </span>
                        <span className="font-medium">
                          {progress.percent}%
                          {progress.answeredCount > 0 && (
                            <span className="text-gray-400 ml-1">
                              ({progress.answeredCount} Antworten)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            progress.percent >= 80
                              ? 'bg-gradient-to-r from-green-500 to-green-400'
                              : progress.percent >= 50
                              ? 'bg-gradient-to-r from-[#003399] to-[#FFCC00]'
                              : 'bg-gradient-to-r from-[#003399] to-blue-400'
                          }`}
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delete Button - prevent navigation on click */}
                  <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                    {showDeleteConfirm === project.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(project.id); }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Löschen bestätigen"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteConfirm(null); }}
                          className="p-2 text-gray-400 hover:bg-gray-100 rounded text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteConfirm(project.id); }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Projekt löschen"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mini Post-Its Preview */}
                {project.knowledgePool?.notes && project.knowledgePool.notes.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <StickyNote size={14} className="text-yellow-500" />
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        Notizen ({project.knowledgePool.notes.length})
                      </span>
                      {project.knowledgePool.notes.filter((n: any) => n.priority === 'urgent').length > 0 && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded-full animate-pulse">
                          <AlertTriangle size={10} />
                          {project.knowledgePool.notes.filter((n: any) => n.priority === 'urgent').length} dringend
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {project.knowledgePool.notes.slice(0, 4).map((note: any) => {
                        const colorBg: Record<string, string> = {
                          yellow: 'bg-yellow-100 border-yellow-300',
                          pink: 'bg-pink-100 border-pink-300',
                          blue: 'bg-blue-100 border-blue-300',
                          green: 'bg-green-100 border-green-300',
                          purple: 'bg-purple-100 border-purple-300',
                          orange: 'bg-orange-100 border-orange-300',
                        };
                        const colorText: Record<string, string> = {
                          yellow: 'text-yellow-800',
                          pink: 'text-pink-800',
                          blue: 'text-blue-800',
                          green: 'text-green-800',
                          purple: 'text-purple-800',
                          orange: 'text-orange-800',
                        };
                        const isDeadlinePast = note.deadline && new Date(note.deadline) < new Date();
                        const isUrgent = note.priority === 'urgent' || note.priority === 'high';

                        return (
                          <div
                            key={note.id}
                            className={`px-2 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 max-w-[180px] ${
                              colorBg[note.color || 'yellow']
                            } ${colorText[note.color || 'yellow']} ${
                              isDeadlinePast ? 'ring-2 ring-red-400' : ''
                            }`}
                            style={{ transform: `rotate(${Math.random() * 2 - 1}deg)` }}
                          >
                            {/* Priority dot */}
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              note.priority === 'urgent' ? 'bg-red-500 animate-pulse' :
                              note.priority === 'high' ? 'bg-orange-500' :
                              note.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-400'
                            }`} />
                            {/* Title truncated */}
                            <span className="truncate font-medium">
                              {note.title}
                            </span>
                            {/* Status icon */}
                            {note.status === 'done' && (
                              <CheckCircle size={10} className="text-green-600 shrink-0" />
                            )}
                            {/* Deadline warning */}
                            {isDeadlinePast && (
                              <AlertTriangle size={10} className="text-red-500 shrink-0" />
                            )}
                            {/* Checklist progress */}
                            {note.checklist?.length > 0 && (
                              <span className="text-[9px] opacity-70">
                                {note.checklist.filter((c: any) => c.checked).length}/{note.checklist.length}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {project.knowledgePool.notes.length > 4 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs">
                          +{project.knowledgePool.notes.length - 4} weitere
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Knowledge Pool Summary */}
                {project.knowledgePool && (project.knowledgePool.documents?.length > 0 || project.knowledgePool.websites?.length > 0) && (
                  <div className={`${project.knowledgePool.notes?.length > 0 ? 'mt-2' : 'mt-4 pt-4 border-t'} flex items-center gap-3 text-xs text-gray-500`}>
                    {project.knowledgePool.documents?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText size={12} className="text-amber-500" />
                        {project.knowledgePool.documents.length} Dok.
                      </span>
                    )}
                    {project.knowledgePool.websites?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Globe size={12} className="text-teal-500" />
                        {project.knowledgePool.websites.length} Web
                      </span>
                    )}
                  </div>
                )}

                {/* Footer with stats */}
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <div className="flex gap-3 text-xs text-gray-500">
                    {project.workPackages.length > 0 && (
                      <span>
                        {project.workPackages.length} Arbeitspaket{project.workPackages.length !== 1 ? "e" : ""}
                      </span>
                    )}
                    {project.results.length > 0 && (
                      <span>
                        {project.results.length} Ergebnis{project.results.length !== 1 ? "se" : ""}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-[#003399] font-medium">
                    Projekt öffnen →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
