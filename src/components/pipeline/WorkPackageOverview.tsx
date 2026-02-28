'use client';

import React, { useState } from 'react';
import {
  PipelineState,
  WorkPackage,
  AnswerData,
  regenerateWPSection,
} from '@/lib/project-pipeline';
import {
  STANDARD_ACTIVITIES,
  STANDARD_DELIVERABLES,
} from '@/lib/wp-templates';
import type { WPConfiguration } from '@/components/pipeline/WorkPackageConfigurator';
import {
  Calendar,
  Edit3,
  FileText,
  Layers,
  Maximize2,
  Minimize2,
  Package,
  Printer,
  Users,
  X,
  Zap,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
  Target,
  Sparkles,
  RefreshCw,
  Check,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface WorkPackageOverviewProps {
  pipelineState: PipelineState;
  wpConfigurations?: WPConfiguration[];
  onUpdateAnswer: (questionId: string, value: string) => void;
  onUpdateWorkPackage: (wpIndex: number, updates: Partial<WorkPackage>) => void;
  language: string;
  onClose?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function strip(t: string): string {
  if (!t) return '';
  return t.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#+\s*/gm, '').replace(/^[-*•]\s*/gm, '').replace(/^\d+[\.)]\s*/gm, '')
    .replace(/`([^`]+)`/g, '$1').replace(/\n{2,}/g, '\n').trim();
}

function truncate(t: string, n: number): string {
  const c = strip(t);
  return c.length <= n ? c : c.substring(0, n).replace(/\s\S*$/, '') + '…';
}

/** Get answer value from state, trying with and without trailing space in key */
function getAns(state: PipelineState, key: string): string {
  const a = state.answers?.[key] || state.answers?.[key + ' '] || state.answers?.[key.trim()];
  if (!a) return '';
  if (typeof a === 'string') return a;
  if (typeof a === 'object' && 'value' in a) return (a as AnswerData).value || '';
  return '';
}

/** Extract bullet points or short sentences from a text block */
function extractBullets(text: string, max = 5): string[] {
  if (!text) return [];
  const clean = strip(text);
  // Split on newlines, semicolons, or sentence ends followed by capital letters
  const parts = clean.split(/\n|;\s*|\.\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 8 && s.length < 200);
  return parts.slice(0, max).map(s => truncate(s, 100));
}

/** Parse individual activities from generated content */
function parseActivities(text: string): { title: string; detail?: string }[] {
  if (!text) return [];
  const clean = strip(text);
  const items: { title: string; detail?: string }[] = [];

  // Try splitting on activity markers: A2.1, Activity 1, 1., 2., etc.
  const activityPattern = /(?:^|\n)\s*(?:A?\d+[\.\)]\d*\.?\s*|Activity\s*\d+[:\s]*|Aktivität\s*\d+[:\s]*)/gi;
  const parts = clean.split(activityPattern).filter(s => s && s.trim().length > 5);

  if (parts.length > 1) {
    parts.forEach(p => {
      const lines = p.trim().split('\n');
      const title = truncate(lines[0], 90);
      const detail = lines.length > 1 ? truncate(lines.slice(1).join(' '), 120) : undefined;
      items.push({ title, detail });
    });
  } else {
    // No clear activity markers — split on sentences/newlines
    const sentences = clean.split(/\n/).map(s => s.trim()).filter(s => s.length > 10);
    sentences.slice(0, 6).forEach(s => items.push({ title: truncate(s, 90) }));
  }

  return items.slice(0, 8);
}

// ============================================================================
// SMART DATA EXTRACTOR — pulls from ALL available sources
// ============================================================================

interface WPDisplayData {
  number: number;
  title: string;
  type: string;
  lead: string;
  duration: { start: number; end: number };
  budget: number;
  objectives: string[];
  activities: { code: string; title: string; timing?: string; category?: string }[];
  deliverables: { title: string; type?: string; month?: string }[];
  partnerRoles: string[];
  hasContent: boolean;
}

const WP_TYPES: Record<string, { icon: string; gradient: string; bg: string; border: string; text: string }> = {
  MANAGEMENT:       { icon: '📋', gradient: 'from-slate-600 to-slate-800',     bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-700' },
  RESEARCH_ANALYSIS:{ icon: '🔬', gradient: 'from-blue-500 to-blue-700',       bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700' },
  DEVELOPMENT:      { icon: '⚙️', gradient: 'from-indigo-500 to-violet-700',   bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700' },
  PILOTING:         { icon: '🧪', gradient: 'from-emerald-500 to-teal-700',    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  DISSEMINATION:    { icon: '📢', gradient: 'from-amber-500 to-orange-700',    bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700' },
};

function detectType(title: string, config?: WPConfiguration): string {
  if (config?.type) return config.type;
  const t = title.toLowerCase();
  if (t.includes('management') || t.includes('koordin')) return 'MANAGEMENT';
  if (t.includes('research') || t.includes('forschung') || t.includes('analyse') || t.includes('needs')) return 'RESEARCH_ANALYSIS';
  if (t.includes('pilot') || t.includes('testing') || t.includes('erprobung') || t.includes('implement')) return 'PILOTING';
  if (t.includes('dissem') || t.includes('verbreit') || t.includes('exploit') || t.includes('impact') || t.includes('communication')) return 'DISSEMINATION';
  return 'DEVELOPMENT';
}

function extractWPData(
  wp: WorkPackage,
  state: PipelineState,
  config?: WPConfiguration,
  language = 'en'
): WPDisplayData {
  const n = wp.number;
  const type = detectType(wp.title, config);
  const isManagement = type === 'MANAGEMENT' || n === 1;

  // LEAD PARTNER
  const leadId = wp.lead || config?.leadPartnerId;
  const leadName = leadId
    ? (state.consortium.find(p => p.id === leadId || p.name === leadId)?.name || leadId)
    : '–';

  // DURATION
  const dur = (() => {
    if (config?.duration) return config.duration;
    if (typeof wp.duration === 'object' && wp.duration && 'start' in wp.duration) return wp.duration as { start: number; end: number };
    if (typeof wp.duration === 'string') {
      const m = wp.duration.match(/M?(\d+)\s*[-–]\s*M?(\d+)/);
      if (m) return { start: parseInt(m[1]), end: parseInt(m[2]) };
    }
    return { start: 1, end: 24 };
  })();

  // BUDGET
  const budget = wp.budget || (config ? Math.round((state.configuration?.totalBudget || 250000) * config.budgetPercent / 100) : 0);

  // OBJECTIVES — from answers or wp.objectives
  let objectives: string[] = [];
  const objAnswer = getAns(state, `wp_objectives_wp${n}`);
  if (objAnswer) {
    objectives = extractBullets(objAnswer, 3);
  } else if (wp.objectives && wp.objectives.length > 0 && wp.objectives[0]) {
    objectives = wp.objectives.filter(o => o).map(o => truncate(o, 100));
  }

  // For management WP — show management areas as objectives
  if (isManagement && objectives.length === 0) {
    const mgmtKeys = ['monitoring', 'budget_control', 'risk_management', 'inclusion_design', 'digital_tools', 'green_practices'];
    const mgmtLabels: Record<string, string> = {
      monitoring: 'Monitoring & Qualitätssicherung',
      budget_control: 'Budget- & Zeitmanagement',
      risk_management: 'Risikomanagement',
      inclusion_design: 'Inklusion & Barrierefreiheit',
      digital_tools: 'Digitale Tools & Zusammenarbeit',
      green_practices: 'Nachhaltige Praktiken',
    };
    mgmtKeys.forEach(k => {
      const val = getAns(state, `${k}_wp${n}`);
      if (val && val.length > 20) {
        objectives.push(language === 'de' ? (mgmtLabels[k] || k) : k.replace(/_/g, ' '));
      }
    });
  }

  // ACTIVITIES — multi-source extraction
  let activities: { code: string; title: string; timing?: string; category?: string }[] = [];

  // Source 1: Real activities from wp.activities (if they have meaningful titles)
  const hasRealActivities = wp.activities && wp.activities.length > 0 &&
    !(wp.activities.length === 1 && wp.activities[0].title?.startsWith('Activities WP'));

  if (hasRealActivities) {
    activities = wp.activities!.map((act, i) => ({
      code: `A${n}.${i + 1}`,
      title: truncate(act.title, 80),
      timing: act.month ? (typeof act.month === 'object' ? `M${act.month.start}–${act.month.end}` : String(act.month)) : undefined,
      category: act.type,
    }));
  }

  // Source 2: Individual activity answers (wp_act1_content_wpN, wp_act2_content_wpN, ...)
  if (activities.length === 0) {
    for (let actNum = 1; actNum <= 5; actNum++) {
      const content = getAns(state, `wp_act${actNum}_content_wp${n}`);
      if (content && content.length > 20) {
        // Extract first sentence as title
        const title = truncate(content.split(/[.!?]\s/)[0] || content, 80);
        activities.push({
          code: `A${n}.${actNum}`,
          title,
        });
      }
    }
  }

  // Source 3: Consolidated activity content (wp_act_content_wpN)
  if (activities.length === 0) {
    const consolidated = getAns(state, `wp_act_content_wp${n}`);
    if (consolidated) {
      const parsed = parseActivities(consolidated);
      parsed.forEach((p, i) => {
        activities.push({ code: `A${n}.${i + 1}`, title: p.title });
      });
    }
  }

  // Source 4: Consolidated block in wp.activities[0].content
  if (activities.length === 0 && wp.activities?.length === 1 && wp.activities[0].content) {
    const parsed = parseActivities(wp.activities[0].content);
    parsed.forEach((p, i) => {
      activities.push({ code: `A${n}.${i + 1}`, title: p.title });
    });
  }

  // Source 5: Config selectedActivities → STANDARD_ACTIVITIES lookup
  if (activities.length === 0 && config?.selectedActivities?.length) {
    config.selectedActivities.forEach((actId, i) => {
      const std = STANDARD_ACTIVITIES[actId];
      activities.push({
        code: `A${n}.${i + 1}`,
        title: std ? (language === 'de' ? std.nameDE : std.name) : actId.replace(/_/g, ' '),
        timing: std?.typicalDuration,
        category: std?.category,
      });
    });
  }

  // For management — show management activities from config or defaults
  if (isManagement && activities.length === 0) {
    const mgmtActivities = ['kickoff', 'quality_plan', 'progress_monitoring', 'consortium_meetings', 'financial_management', 'reporting'];
    mgmtActivities.forEach((actId, i) => {
      const std = STANDARD_ACTIVITIES[actId];
      if (std) {
        activities.push({
          code: `A${n}.${i + 1}`,
          title: language === 'de' ? std.nameDE : std.name,
          timing: std.typicalDuration,
          category: std.category,
        });
      }
    });
  }

  // DELIVERABLES
  let deliverables: { title: string; type?: string; month?: string }[] = [];

  if (wp.deliverables && wp.deliverables.length > 0) {
    deliverables = wp.deliverables.map(d => ({
      title: truncate(d.title, 60),
      type: d.type,
      month: d.dueMonth ? `M${d.dueMonth}` : undefined,
    }));
  }

  if (deliverables.length === 0 && config?.selectedDeliverables?.length) {
    config.selectedDeliverables.forEach(delId => {
      const std = STANDARD_DELIVERABLES[delId];
      deliverables.push({
        title: std ? (language === 'de' ? std.nameDE : std.name) : delId.replace(/_/g, ' '),
        type: std?.type,
      });
    });
  }

  // PARTNER ROLES
  const partnerRoles: string[] = [];
  const rolesAnswer = getAns(state, `wp_partners_wp${n}`);
  if (rolesAnswer) {
    const parsed = extractBullets(rolesAnswer, 4);
    partnerRoles.push(...parsed);
  } else if (wp.partnerRoles?.length) {
    wp.partnerRoles.forEach(pr => partnerRoles.push(`${pr.partner}: ${truncate(pr.role, 50)}`));
  }

  const hasContent = objectives.length > 0 || activities.length > 0 || deliverables.length > 0;

  return { number: n, title: strip(wp.title), type, lead: leadName, duration: dur, budget, objectives, activities, deliverables, partnerRoles, hasContent };
}

// ============================================================================
// INLINE EDIT
// ============================================================================

function InlineEdit({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  if (editing) {
    return (
      <input autoFocus value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { onSave(text); setEditing(false); } if (e.key === 'Escape') { setText(value); setEditing(false); } }}
        onBlur={() => { if (text !== value) onSave(text); setEditing(false); }}
        className="w-full px-1 py-0.5 border border-blue-400 rounded text-xs focus:outline-none bg-white"
      />
    );
  }
  return (
    <span className="cursor-pointer hover:bg-yellow-50 rounded px-0.5 group inline-flex items-center gap-0.5"
      onClick={() => { setText(value); setEditing(true); }} title="Bearbeiten">
      {value || '–'}
      <Edit3 className="w-2.5 h-2.5 text-blue-300 opacity-0 group-hover:opacity-100 print:hidden shrink-0" />
    </span>
  );
}

// ============================================================================
// REGENERATE MODAL — Side-by-side diff preview
// ============================================================================

interface RegenRequest {
  wpNumber: number;
  answerKey: string;
  label: string;
  oldText: string;
}

function RegenerateModal({
  request,
  pipelineState,
  language,
  onAccept,
  onClose,
}: {
  request: RegenRequest;
  pipelineState: PipelineState;
  language: string;
  onAccept: (answerKey: string, newText: string) => void;
  onClose: () => void;
}) {
  const [instruction, setInstruction] = useState('');
  const [mode, setMode] = useState<'replace' | 'enhance'>('enhance');
  const [isGenerating, setIsGenerating] = useState(false);
  const [newText, setNewText] = useState('');
  const [editableNew, setEditableNew] = useState('');
  const [showResult, setShowResult] = useState(false);

  const handleGenerate = async () => {
    if (!instruction.trim()) return;
    setIsGenerating(true);
    try {
      const result = await regenerateWPSection(
        pipelineState,
        request.wpNumber,
        request.answerKey,
        instruction,
        request.oldText,
        mode,
        language
      );
      setNewText(result.newText);
      setEditableNew(result.newText);
      setShowResult(true);
    } catch (e: any) {
      console.error('Regeneration failed:', e);
      setNewText(`Fehler: ${e.message}`);
      setEditableNew('');
      setShowResult(true);
    }
    setIsGenerating(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="text-white">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              WP{request.wpNumber} — {request.label}
            </h3>
            <p className="text-white/60 text-[11px]">Text anpassen basierend auf Evaluator-Feedback</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-white" /></button>
        </div>

        {/* Input area */}
        {!showResult && (
          <div className="p-5 space-y-3 shrink-0 border-b">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Was soll geändert werden?
              </label>
              <textarea
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                placeholder={language === 'de'
                  ? 'z.B. "Surveys on the Target Group hinzufügen" oder "mehr Fokus auf digitale Kompetenzen"'
                  : 'e.g. "Add surveys on the target group" or "more focus on digital competences"'}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[60px] resize-none"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('enhance')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'enhance' ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'bg-gray-100 text-gray-500'}`}
                >
                  Erweitern & Verbessern
                </button>
                <button
                  onClick={() => setMode('replace')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'replace' ? 'bg-red-100 text-red-700 ring-1 ring-red-300' : 'bg-gray-100 text-gray-500'}`}
                >
                  Komplett neu schreiben
                </button>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !instruction.trim()}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />Generiere...</>
                ) : (
                  <><Sparkles className="w-4 h-4" />Generieren</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Side-by-side diff preview */}
        {showResult && (
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-2 gap-0 h-full">
              {/* OLD */}
              <div className="border-r border-gray-200">
                <div className="bg-red-50 px-4 py-2 border-b border-red-200 sticky top-0">
                  <span className="text-xs font-bold text-red-700">AKTUELLER TEXT</span>
                </div>
                <div className="p-4 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {request.oldText || <span className="italic text-gray-400">Kein bestehender Text</span>}
                </div>
              </div>
              {/* NEW */}
              <div>
                <div className="bg-green-50 px-4 py-2 border-b border-green-200 sticky top-0">
                  <span className="text-xs font-bold text-green-700">NEUER TEXT</span>
                  <span className="text-[10px] text-green-500 ml-2">(editierbar)</span>
                </div>
                <div className="p-4">
                  <textarea
                    value={editableNew}
                    onChange={e => setEditableNew(e.target.value)}
                    className="w-full text-sm text-gray-700 whitespace-pre-wrap leading-relaxed min-h-[300px] resize-y border border-green-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-300"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer with actions */}
        {showResult && (
          <div className="border-t bg-gray-50 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => { setShowResult(false); setNewText(''); setEditableNew(''); }}
                className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-300"
              >
                <ArrowRight className="w-3 h-3 inline mr-1 rotate-180" />Nochmal generieren
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-300"
              >
                Verwerfen
              </button>
              <button
                onClick={() => {
                  onAccept(request.answerKey, editableNew);
                  onClose();
                }}
                disabled={!editableNew.trim()}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-emerald-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Übernehmen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// WP CARD
// ============================================================================

function WPCard({ data, wpIndex, onUpdateWP, onRegenerate, pipelineState, expanded, onToggle }: {
  data: WPDisplayData;
  wpIndex: number;
  onUpdateWP: (idx: number, u: Partial<WorkPackage>) => void;
  onRegenerate: (req: RegenRequest) => void;
  pipelineState: PipelineState;
  expanded: boolean;
  onToggle: () => void;
}) {
  const s = WP_TYPES[data.type] || WP_TYPES.DEVELOPMENT;
  const months = data.duration.end - data.duration.start + 1;

  return (
    <div className={`bg-white rounded-xl border ${s.border} shadow-sm print:shadow-none print:break-inside-avoid overflow-hidden`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${s.gradient} px-3 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-1.5">
          <span className="text-base">{s.icon}</span>
          <span className="text-white font-bold text-sm">WP{data.number}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="bg-white/15 text-white text-[9px] px-1.5 py-0.5 rounded-full">M{data.duration.start}–{data.duration.end}</span>
          {data.budget > 0 && <span className="bg-white/15 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{data.budget.toLocaleString('de-DE')}€</span>}
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Title */}
        <h4 className="font-semibold text-[13px] text-gray-800 leading-snug">
          <InlineEdit value={data.title} onSave={v => onUpdateWP(wpIndex, { title: v })} />
        </h4>

        {/* Lead + Duration */}
        <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
          <span className="font-medium text-gray-700 flex items-center gap-0.5"><Users className="w-3 h-3" />{data.lead}</span>
          <span className="text-gray-300">|</span>
          <span><Clock className="w-3 h-3 inline" /> {months}M</span>
        </div>

        {/* Objectives */}
        {data.objectives.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
                <Target className="w-3 h-3" /> Ziele
              </span>
              <button
                onClick={() => onRegenerate({
                  wpNumber: data.number,
                  answerKey: `wp_objectives_wp${data.number}`,
                  label: 'Ziele / Objectives',
                  oldText: getAns(pipelineState, `wp_objectives_wp${data.number}`),
                })}
                className="text-[9px] text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 print:hidden"
              >
                <Sparkles className="w-3 h-3" />
              </button>
            </div>
            <ul className="space-y-0.5">
              {data.objectives.map((o, i) => (
                <li key={i} className="text-[11px] text-gray-600 flex items-start gap-1">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <hr className="border-gray-100" />

        {/* Activities */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3" /> Aktivitäten
            </span>
            <div className="flex items-center gap-1">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${s.bg} ${s.text}`}>{data.activities.length}</span>
              <button
                onClick={() => onRegenerate({
                  wpNumber: data.number,
                  answerKey: `wp_act_content_wp${data.number}`,
                  label: `Aktivitäten`,
                  oldText: getAns(pipelineState, `wp_act_content_wp${data.number}`),
                })}
                className="text-[9px] text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 print:hidden"
                title="Aktivitäten mit KI anpassen"
              >
                <Sparkles className="w-3 h-3" />
              </button>
            </div>
          </div>
          {data.activities.length === 0 ? (
            <p className="text-[10px] text-gray-400 italic text-center py-1">Noch nicht generiert</p>
          ) : (
            <div className="space-y-0.5">
              {(expanded ? data.activities : data.activities.slice(0, 4)).map((act, actIdx) => (
                <div key={act.code} className={`flex items-start gap-1.5 ${s.bg} rounded px-2 py-1 group/act`}>
                  <span className={`text-[8px] font-bold text-white bg-gradient-to-r ${s.gradient} px-1 py-0.5 rounded shrink-0`}>{act.code}</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] text-gray-700">{act.title}</span>
                    {act.timing && <span className="text-[9px] text-gray-400 ml-1">({act.timing})</span>}
                  </div>
                  <button
                    onClick={() => {
                      const actNum = actIdx + 1;
                      const key = `wp_act${actNum}_content_wp${data.number}`;
                      const fallbackKey = `wp_act_content_wp${data.number}`;
                      const oldText = getAns(pipelineState, key) || getAns(pipelineState, fallbackKey);
                      onRegenerate({
                        wpNumber: data.number,
                        answerKey: key,
                        label: `${act.code}: ${act.title}`,
                        oldText,
                      });
                    }}
                    className="opacity-0 group-hover/act:opacity-100 text-indigo-400 hover:text-indigo-600 print:hidden shrink-0"
                    title="Diese Aktivität anpassen"
                  >
                    <Sparkles className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {!expanded && data.activities.length > 4 && (
                <button onClick={onToggle} className="w-full text-[10px] text-blue-500 py-0.5 print:hidden">
                  +{data.activities.length - 4} weitere
                </button>
              )}
            </div>
          )}
        </div>

        {/* Deliverables */}
        {data.deliverables.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-1 flex items-center gap-1">
              <Package className="w-3 h-3" /> Ergebnisse
            </div>
            <div className="space-y-0.5">
              {(expanded ? data.deliverables : data.deliverables.slice(0, 3)).map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px]">
                  <FileText className="w-3 h-3 text-gray-300 shrink-0" />
                  <span className="text-gray-600">{d.title}</span>
                  {d.month && <span className="text-[9px] text-gray-400 ml-auto">{d.month}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Partner Roles - expanded only */}
        {expanded && data.partnerRoles.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-1 flex items-center gap-1">
              <Users className="w-3 h-3" /> Aufgabenverteilung
            </div>
            <ul className="space-y-0.5">
              {data.partnerRoles.map((r, i) => (
                <li key={i} className="text-[10px] text-gray-500">{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <button onClick={onToggle}
        className={`w-full px-3 py-1 ${s.bg} border-t ${s.border} flex items-center justify-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 print:hidden`}>
        {expanded ? <><ChevronUp className="w-3 h-3" />weniger</> : <><ChevronDown className="w-3 h-3" />Details</>}
      </button>
    </div>
  );
}

// ============================================================================
// TIMELINE
// ============================================================================

function Timeline({ items, total }: { items: WPDisplayData[]; total: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 print:p-2">
      <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
        <Calendar className="w-3 h-3 inline mr-1" />Timeline ({total}M)
      </div>
      <div className="space-y-1">
        {items.map(wp => {
          const s = WP_TYPES[wp.type] || WP_TYPES.DEVELOPMENT;
          const left = ((wp.duration.start - 1) / total) * 100;
          const width = ((wp.duration.end - wp.duration.start + 1) / total) * 100;
          return (
            <div key={wp.number} className="flex items-center h-5 gap-1">
              <span className="w-7 text-[9px] font-bold text-gray-500 text-right">WP{wp.number}</span>
              <div className="flex-1 relative h-4 bg-gray-50 rounded-full overflow-hidden">
                <div className={`absolute h-full rounded-full bg-gradient-to-r ${s.gradient}`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }} />
              </div>
              <span className="text-[8px] text-gray-400 w-12">M{wp.duration.start}–{wp.duration.end}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// BUDGET BAR
// ============================================================================

function BudgetBar({ items, total }: { items: WPDisplayData[]; total: number }) {
  const allocated = items.reduce((s, w) => s + w.budget, 0);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 print:p-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider"><DollarSign className="w-3 h-3 inline mr-1" />Budget</span>
        <span className="text-xs font-bold text-gray-700">{allocated.toLocaleString('de-DE')}€ <span className="text-gray-400 font-normal">/ {total.toLocaleString('de-DE')}€</span></span>
      </div>
      <div className="flex h-5 rounded-lg overflow-hidden bg-gray-100">
        {items.map(wp => {
          const pct = total > 0 ? (wp.budget / total) * 100 : 0;
          if (pct < 1) return null;
          const s = WP_TYPES[wp.type] || WP_TYPES.DEVELOPMENT;
          return <div key={wp.number} className={`bg-gradient-to-b ${s.gradient} flex items-center justify-center border-r border-white/20`}
            style={{ width: `${pct}%` }} title={`WP${wp.number}: ${wp.budget.toLocaleString('de-DE')}€`}>
            <span className="text-[7px] text-white font-bold">{pct > 7 ? `WP${wp.number}` : ''}</span>
          </div>;
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 mt-1">
        {items.map(wp => {
          const pct = total > 0 ? (wp.budget / total) * 100 : 0;
          const s = WP_TYPES[wp.type] || WP_TYPES.DEVELOPMENT;
          return <span key={wp.number} className="text-[8px] text-gray-500"><span className={`inline-block w-2 h-2 rounded-full bg-gradient-to-r ${s.gradient} mr-0.5`} />WP{wp.number} {pct.toFixed(0)}%</span>;
        })}
      </div>
    </div>
  );
}

// ============================================================================
// PRINT VIEW — Landscape Mindmap-style Overview
// ============================================================================

function PrintOverview({ items, projectTitle, acronym, totalBudget, duration }: {
  items: WPDisplayData[]; projectTitle: string; acronym: string; totalBudget: number; duration: number;
}) {
  return (
    <div className="hidden print:block wp-print-overview">
      {/* Header */}
      <div className="text-center mb-4 border-b-2 border-indigo-600 pb-2">
        <h1 className="text-xl font-bold text-indigo-800">{acronym || truncate(projectTitle, 60)}</h1>
        {acronym && projectTitle && <p className="text-[10px] text-gray-500">{truncate(projectTitle, 100)}</p>}
        <div className="flex justify-center gap-4 mt-1 text-[10px] text-gray-600">
          <span>{items.length} Arbeitspakete</span>
          <span>{duration} Monate</span>
          <span>{totalBudget.toLocaleString('de-DE')}€</span>
          <span>{items.reduce((s, w) => s + w.activities.length, 0)} Aktivitäten</span>
        </div>
      </div>

      {/* Timeline strip */}
      <div className="flex items-center gap-0.5 mb-4 px-2">
        <span className="text-[8px] text-gray-400 w-6">M1</span>
        <div className="flex-1 relative h-3 bg-gray-100 rounded-full overflow-hidden">
          {items.map(wp => {
            const s = WP_TYPES[wp.type] || WP_TYPES.DEVELOPMENT;
            const left = ((wp.duration.start - 1) / duration) * 100;
            const width = ((wp.duration.end - wp.duration.start + 1) / duration) * 100;
            return <div key={wp.number} className={`absolute h-full bg-gradient-to-r ${s.gradient} opacity-80`}
              style={{ left: `${left}%`, width: `${width}%`, top: 0 }} />;
          })}
        </div>
        <span className="text-[8px] text-gray-400 w-8 text-right">M{duration}</span>
      </div>

      {/* WP Grid — compact mindmap style */}
      <div className="grid grid-cols-3 gap-3" style={{ gridTemplateColumns: items.length <= 4 ? 'repeat(2, 1fr)' : items.length <= 6 ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)' }}>
        {items.map(wp => {
          const s = WP_TYPES[wp.type] || WP_TYPES.DEVELOPMENT;
          return (
            <div key={wp.number} className="border border-gray-300 rounded-lg overflow-hidden" style={{ breakInside: 'avoid' }}>
              {/* WP Header */}
              <div className={`bg-gradient-to-r ${s.gradient} px-2 py-1 flex items-center justify-between`}>
                <span className="text-white font-bold text-[10px]">{s.icon} WP{wp.number}: {truncate(wp.title, 35)}</span>
                <span className="text-white/70 text-[8px]">M{wp.duration.start}–{wp.duration.end} | {wp.budget.toLocaleString('de-DE')}€</span>
              </div>

              <div className="p-2 space-y-1.5">
                {/* Lead */}
                <div className="text-[9px] text-gray-500">
                  <span className="font-semibold">Lead:</span> {wp.lead}
                </div>

                {/* Objectives */}
                {wp.objectives.length > 0 && (
                  <div>
                    <div className="text-[8px] text-gray-400 font-semibold uppercase">Ziele:</div>
                    {wp.objectives.slice(0, 2).map((o, i) => (
                      <div key={i} className="text-[9px] text-gray-600 flex items-start gap-0.5">
                        <span className="text-green-500">•</span>{truncate(o, 60)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Activities */}
                {wp.activities.length > 0 && (
                  <div>
                    <div className="text-[8px] text-gray-400 font-semibold uppercase">Aktivitäten:</div>
                    {wp.activities.slice(0, 5).map(act => (
                      <div key={act.code} className="text-[9px] text-gray-600 flex items-start gap-0.5">
                        <span className={`font-bold ${s.text} text-[8px]`}>{act.code}</span>
                        <span>{truncate(act.title, 50)}</span>
                      </div>
                    ))}
                    {wp.activities.length > 5 && <div className="text-[8px] text-gray-400">+{wp.activities.length - 5} weitere</div>}
                  </div>
                )}

                {/* Deliverables */}
                {wp.deliverables.length > 0 && (
                  <div>
                    <div className="text-[8px] text-gray-400 font-semibold uppercase">Ergebnisse:</div>
                    {wp.deliverables.slice(0, 3).map((d, i) => (
                      <div key={i} className="text-[9px] text-gray-600">📄 {truncate(d.title, 45)}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-1 border-t border-gray-300 text-[8px] text-gray-400 text-center">
        {projectTitle} · WP-Übersicht · {new Date().toLocaleDateString('de-DE')} · STARS Erasmus+ Architect
      </div>
    </div>
  );
}

// ============================================================================
// MAIN
// ============================================================================

export default function WorkPackageOverview({
  pipelineState,
  wpConfigurations: wpConfigs,
  onUpdateAnswer,
  onUpdateWorkPackage,
  language,
  onClose,
}: WorkPackageOverviewProps) {
  const [expandedWPs, setExpandedWPs] = useState<Set<number>>(new Set());
  const [showTimeline, setShowTimeline] = useState(true);
  const [allExpanded, setAllExpanded] = useState(false);
  const [regenRequest, setRegenRequest] = useState<RegenRequest | null>(null);

  const workPackages = pipelineState.workPackages || [];
  const totalBudget = pipelineState.configuration?.totalBudget || 250000;
  const duration = pipelineState.configuration?.duration || 24;
  const projectTitle = strip(pipelineState.projectTitle || 'Projekt');
  const acronym = pipelineState.acronym || '';

  // Extract display data for all WPs
  const wpData = workPackages.map(wp => {
    const cfg = wpConfigs?.find(c => c.wpNumber === wp.number);
    return extractWPData(wp, pipelineState, cfg, language);
  });

  const toggleWP = (n: number) => {
    setExpandedWPs(prev => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedWPs(new Set());
    } else {
      setExpandedWPs(new Set(wpData.map(w => w.number)));
    }
    setAllExpanded(!allExpanded);
  };

  if (workPackages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Layers className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium">Noch keine Arbeitspakete generiert</p>
      </div>
    );
  }

  const totalActivities = wpData.reduce((s, w) => s + w.activities.length, 0);
  const totalDeliverables = wpData.reduce((s, w) => s + w.deliverables.length, 0);

  const gridCols = wpData.length <= 3 ? 'lg:grid-cols-3' : wpData.length <= 4 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-3';

  return (
    <>
      {/* SCREEN VIEW */}
      <div className="wp-overview-screen space-y-4 print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              WP-Dashboard
              {acronym && <span className="text-indigo-500">— {acronym}</span>}
            </h2>
            <p className="text-[11px] text-gray-400">
              {acronym ? truncate(projectTitle, 80) : truncate(projectTitle, 40)}
              {' · '}{wpData.length} WPs · {totalActivities} Aktivitäten · {totalDeliverables} Ergebnisse · {duration} Monate
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowTimeline(!showTimeline)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium ${showTimeline ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
              <Calendar className="w-3 h-3 inline mr-0.5" />Zeitplan
            </button>
            <button onClick={toggleAll}
              className="px-2 py-1 rounded-lg text-[11px] font-medium bg-gray-100 text-gray-500 hover:bg-gray-200">
              {allExpanded ? <Minimize2 className="w-3 h-3 inline mr-0.5" /> : <Maximize2 className="w-3 h-3 inline mr-0.5" />}
              {allExpanded ? 'Kompakt' : 'Alle Details'}
            </button>
            <button onClick={() => window.print()}
              className="px-2 py-1 rounded-lg text-[11px] font-medium bg-gray-100 text-gray-500 hover:bg-gray-200">
              <Printer className="w-3 h-3 inline mr-0.5" />Drucken
            </button>
            {onClose && (
              <button onClick={onClose} className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Summary bars */}
        <div className={`grid gap-3 ${showTimeline ? 'lg:grid-cols-2' : ''}`}>
          <BudgetBar items={wpData} total={totalBudget} />
          {showTimeline && <Timeline items={wpData} total={duration} />}
        </div>

        {/* WP Cards */}
        <div className={`grid grid-cols-1 ${gridCols} gap-3`}>
          {wpData.map((d, idx) => (
            <WPCard key={d.number} data={d} wpIndex={idx} onUpdateWP={onUpdateWorkPackage}
              onRegenerate={setRegenRequest} pipelineState={pipelineState}
              expanded={expandedWPs.has(d.number)} onToggle={() => toggleWP(d.number)} />
          ))}
        </div>
      </div>

      {/* REGENERATE MODAL */}
      {regenRequest && (
        <RegenerateModal
          request={regenRequest}
          pipelineState={pipelineState}
          language={language}
          onAccept={(answerKey, newText) => {
            onUpdateAnswer(answerKey, newText);
            setRegenRequest(null);
          }}
          onClose={() => setRegenRequest(null)}
        />
      )}

      {/* PRINT VIEW — separate clean layout */}
      <PrintOverview items={wpData} projectTitle={projectTitle} acronym={acronym} totalBudget={totalBudget} duration={duration} />

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          /* Hide everything except print overview */
          body > * { visibility: hidden !important; }
          .wp-overview-screen { display: none !important; }
          .wp-print-overview {
            display: block !important;
            visibility: visible !important;
            position: fixed;
            left: 0; top: 0;
            width: 100%;
            height: 100%;
            padding: 8mm;
            background: white;
            z-index: 99999;
          }
          .wp-print-overview * { visibility: visible !important; }
          @page { size: A4 landscape; margin: 6mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </>
  );
}
