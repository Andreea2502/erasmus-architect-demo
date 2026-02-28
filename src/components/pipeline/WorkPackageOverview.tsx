'use client';

import React, { useState } from 'react';
import {
  PipelineState,
  WorkPackage,
  AnswerData,
} from '@/lib/project-pipeline';
import {
  STANDARD_ACTIVITIES,
  STANDARD_DELIVERABLES,
  type WPActivity,
  type WPDeliverable,
} from '@/lib/wp-templates';
import type { WPConfiguration } from '@/components/pipeline/WorkPackageConfigurator';
import {
  Calendar,
  Check,
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
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MapPin,
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

/** A clean, parsed activity for display */
interface ParsedActivity {
  id: string;
  code: string;          // A1.1, A2.3
  title: string;         // Clean, short name
  description?: string;  // One-liner description
  timing: string;        // M1-M3, ongoing, etc.
  category: string;      // meeting, development, research, etc.
  responsible?: string;
  isMandatory?: boolean;
  source: 'config' | 'generated' | 'parsed'; // Where we got this
}

/** A clean, parsed deliverable */
interface ParsedDeliverable {
  id: string;
  title: string;
  type: string;
  timing: string;
  source: 'config' | 'generated';
}

// ============================================================================
// HELPERS
// ============================================================================

/** Strip markdown formatting */
function strip(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*•]\s*/gm, '')
    .replace(/^\d+\.\s*/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** Truncate text to max length */
function truncate(text: string, max: number): string {
  const clean = strip(text);
  if (clean.length <= max) return clean;
  return clean.substring(0, max).replace(/\s\S*$/, '') + '…';
}

/** Get an answer value from pipeline state */
function getAnswer(state: PipelineState, key: string): string {
  const ans = state.answers?.[key];
  if (!ans) return '';
  if (typeof ans === 'string') return ans;
  if (typeof ans === 'object' && 'value' in ans) return (ans as AnswerData).value || '';
  return '';
}

/** Parse activities from consolidated content text — tries to extract individual items */
function parseActivitiesFromContent(content: string): { title: string; description?: string }[] {
  if (!content) return [];
  const clean = strip(content);
  const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 10);

  // Try to find numbered or bulleted items
  const items: { title: string; description?: string }[] = [];
  let currentTitle = '';

  for (const line of lines) {
    // Detect new activity item (numbered, bulleted, or titled)
    const isNewItem = /^(\d+[\.\)]\s*|[A-Z][\.\)]\s*|Activity\s*\d|Aktivität\s*\d)/i.test(line) ||
                      (line.length < 120 && line.length > 10 && !line.endsWith('.') && items.length < 10);

    if (isNewItem && line.length < 150) {
      if (currentTitle) items.push({ title: truncate(currentTitle, 80) });
      currentTitle = line;
    } else if (currentTitle && line.length > 10) {
      // This is description for current item
      items[items.length] = { title: truncate(currentTitle, 80), description: truncate(line, 120) };
      currentTitle = '';
    }
  }
  if (currentTitle) items.push({ title: truncate(currentTitle, 80) });

  return items.slice(0, 10); // Max 10 activities
}

// ============================================================================
// SMART ACTIVITY EXTRACTOR
// ============================================================================

function extractActivities(
  wp: WorkPackage,
  wpConfig: WPConfiguration | undefined,
  state: PipelineState,
  language: string
): ParsedActivity[] {
  const activities: ParsedActivity[] = [];
  const wpNum = wp.number;

  // SOURCE 1: WP Configuration — selectedActivities (best source, has clean IDs)
  if (wpConfig?.selectedActivities && wpConfig.selectedActivities.length > 0) {
    wpConfig.selectedActivities.forEach((actId, i) => {
      const stdAct = STANDARD_ACTIVITIES[actId];
      if (stdAct) {
        activities.push({
          id: actId,
          code: `A${wpNum}.${i + 1}`,
          title: language === 'de' ? stdAct.nameDE : stdAct.name,
          description: language === 'de' ? stdAct.descriptionDE : stdAct.description,
          timing: stdAct.typicalDuration,
          category: stdAct.category,
          isMandatory: stdAct.mandatory,
          source: 'config',
        });
      } else {
        // Custom activity ID — use as title
        activities.push({
          id: actId,
          code: `A${wpNum}.${i + 1}`,
          title: actId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          timing: '–',
          category: 'other',
          source: 'config',
        });
      }
    });
  }

  // SOURCE 2: Generated activities in wp.activities array
  if (activities.length === 0 && wp.activities && wp.activities.length > 0) {
    // Check if we have ONE consolidated activity or multiple real ones
    if (wp.activities.length === 1 && wp.activities[0].title?.startsWith('Activities WP')) {
      // Consolidated block — try to parse the content
      const content = wp.activities[0].content || wp.activities[0].description || '';
      const parsed = parseActivitiesFromContent(content);
      parsed.forEach((item, i) => {
        activities.push({
          id: `parsed-${wpNum}-${i}`,
          code: `A${wpNum}.${i + 1}`,
          title: item.title,
          description: item.description,
          timing: '–',
          category: 'other',
          source: 'parsed',
        });
      });
    } else {
      // Multiple real activities
      wp.activities.forEach((act, i) => {
        activities.push({
          id: act.id || `gen-${wpNum}-${i}`,
          code: `A${wpNum}.${i + 1}`,
          title: truncate(act.title, 80),
          description: act.description ? truncate(act.description, 120) : undefined,
          timing: act.month
            ? (typeof act.month === 'object' ? `M${act.month.start}–${act.month.end}` : String(act.month))
            : '–',
          category: act.type || 'other',
          responsible: act.responsible,
          source: 'generated',
        });
      });
    }
  }

  // SOURCE 3: If still empty, try to extract from answer content
  if (activities.length === 0) {
    const actContent = getAnswer(state, `wp_act_content_wp${wpNum}`);
    if (actContent) {
      const parsed = parseActivitiesFromContent(actContent);
      parsed.forEach((item, i) => {
        activities.push({
          id: `answer-${wpNum}-${i}`,
          code: `A${wpNum}.${i + 1}`,
          title: item.title,
          description: item.description,
          timing: '–',
          category: 'other',
          source: 'parsed',
        });
      });
    }
  }

  return activities;
}

function extractDeliverables(
  wp: WorkPackage,
  wpConfig: WPConfiguration | undefined,
  language: string
): ParsedDeliverable[] {
  const deliverables: ParsedDeliverable[] = [];

  // SOURCE 1: WP Configuration — selectedDeliverables
  if (wpConfig?.selectedDeliverables && wpConfig.selectedDeliverables.length > 0) {
    wpConfig.selectedDeliverables.forEach(delId => {
      const stdDel = STANDARD_DELIVERABLES[delId];
      if (stdDel) {
        deliverables.push({
          id: delId,
          title: language === 'de' ? stdDel.nameDE : stdDel.name,
          type: stdDel.type,
          timing: '–',
          source: 'config',
        });
      } else {
        deliverables.push({
          id: delId,
          title: delId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          type: 'other',
          timing: '–',
          source: 'config',
        });
      }
    });
  }

  // SOURCE 2: Generated deliverables
  if (deliverables.length === 0 && wp.deliverables && wp.deliverables.length > 0) {
    wp.deliverables.forEach(del => {
      deliverables.push({
        id: del.id,
        title: truncate(del.title, 60),
        type: del.type,
        timing: del.dueMonth ? `M${del.dueMonth}` : '–',
        source: 'generated',
      });
    });
  }

  return deliverables;
}

// ============================================================================
// WP TYPE CONFIG
// ============================================================================

const WP_STYLE: Record<string, { gradient: string; bg: string; border: string; icon: string; label: string; accent: string }> = {
  MANAGEMENT:       { gradient: 'from-slate-600 to-slate-800',     bg: 'bg-slate-50',    border: 'border-slate-200',    icon: '📋', label: 'Management',    accent: 'bg-slate-100 text-slate-700' },
  RESEARCH_ANALYSIS:{ gradient: 'from-blue-500 to-blue-700',       bg: 'bg-blue-50',     border: 'border-blue-200',     icon: '🔬', label: 'Research',      accent: 'bg-blue-100 text-blue-700' },
  DEVELOPMENT:      { gradient: 'from-indigo-500 to-violet-700',   bg: 'bg-indigo-50',   border: 'border-indigo-200',   icon: '⚙️', label: 'Development',   accent: 'bg-indigo-100 text-indigo-700' },
  PILOTING:         { gradient: 'from-emerald-500 to-teal-700',    bg: 'bg-emerald-50',  border: 'border-emerald-200',  icon: '🧪', label: 'Piloting',      accent: 'bg-emerald-100 text-emerald-700' },
  DISSEMINATION:    { gradient: 'from-amber-500 to-orange-700',    bg: 'bg-amber-50',    border: 'border-amber-200',    icon: '📢', label: 'Dissemination', accent: 'bg-amber-100 text-amber-700' },
  QUALITY:          { gradient: 'from-purple-500 to-purple-700',   bg: 'bg-purple-50',   border: 'border-purple-200',   icon: '✅', label: 'Quality',       accent: 'bg-purple-100 text-purple-700' },
};

function getStyle(wp: WorkPackage, wpConfig?: WPConfiguration) {
  const type = wpConfig?.type || detectType(wp);
  return WP_STYLE[type] || WP_STYLE.DEVELOPMENT;
}

function detectType(wp: WorkPackage): string {
  const t = wp.title.toLowerCase();
  if (t.includes('management') || t.includes('koordin') || t.includes('projektmanagement')) return 'MANAGEMENT';
  if (t.includes('research') || t.includes('forschung') || t.includes('analyse') || t.includes('needs')) return 'RESEARCH_ANALYSIS';
  if (t.includes('develop') || t.includes('entwickl') || t.includes('creation') || t.includes('erstellung') || t.includes('design') || t.includes('curriculum') || t.includes('framework')) return 'DEVELOPMENT';
  if (t.includes('pilot') || t.includes('testing') || t.includes('erprobung') || t.includes('implement')) return 'PILOTING';
  if (t.includes('dissem') || t.includes('verbreit') || t.includes('exploit') || t.includes('valoris') || t.includes('communication') || t.includes('impact')) return 'DISSEMINATION';
  if (t.includes('quality') || t.includes('qualit') || t.includes('evaluation')) return 'QUALITY';
  return 'DEVELOPMENT';
}

function parseDuration(wp: WorkPackage): { start: number; end: number } {
  if (typeof wp.duration === 'object' && wp.duration && 'start' in wp.duration) return wp.duration as { start: number; end: number };
  if (typeof wp.duration === 'string') {
    const m = wp.duration.match(/M?(\d+)\s*[-–]\s*M?(\d+)/);
    if (m) return { start: parseInt(m[1]), end: parseInt(m[2]) };
  }
  return { start: 1, end: 24 };
}

// Category icons
const CATEGORY_ICONS: Record<string, string> = {
  meeting: '🤝',
  development: '🛠️',
  testing: '🧪',
  communication: '📣',
  management: '📊',
  research: '🔍',
  other: '📌',
};

// ============================================================================
// INLINE EDIT
// ============================================================================

function InlineEdit({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { onSave(text); setEditing(false); }
          if (e.key === 'Escape') { setText(value); setEditing(false); }
        }}
        onBlur={() => { if (text !== value) onSave(text); setEditing(false); }}
        className="w-full px-1 py-0.5 border border-blue-400 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
      />
    );
  }

  return (
    <span
      className="cursor-pointer hover:bg-yellow-50 rounded px-0.5 transition-colors group inline-flex items-center gap-0.5"
      onClick={() => { setText(value); setEditing(true); }}
      title="Klicken zum Bearbeiten"
    >
      {value || '–'}
      <Edit3 className="w-2.5 h-2.5 text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity print:hidden shrink-0" />
    </span>
  );
}

// ============================================================================
// COMPACT TIMELINE
// ============================================================================

function Timeline({ workPackages, duration }: { workPackages: WorkPackage[]; duration: number }) {
  const total = duration || 24;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
        <Calendar className="w-3 h-3 inline mr-1" />Zeitplan ({total} Monate)
      </div>
      <div className="space-y-1">
        {workPackages.map(wp => {
          const d = parseDuration(wp);
          const left = ((d.start - 1) / total) * 100;
          const width = ((d.end - d.start + 1) / total) * 100;
          const s = getStyle(wp);
          return (
            <div key={wp.number} className="flex items-center h-5 gap-2">
              <span className="w-8 text-[10px] font-bold text-gray-500 text-right">WP{wp.number}</span>
              <div className="flex-1 relative h-4 bg-gray-50 rounded-full overflow-hidden">
                <div
                  className={`absolute h-full rounded-full bg-gradient-to-r ${s.gradient}`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-400 w-14 text-right">M{d.start}–{d.end}</span>
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

function BudgetBar({ workPackages, totalBudget }: { workPackages: WorkPackage[]; totalBudget: number }) {
  const allocated = workPackages.reduce((s, wp) => s + (wp.budget || 0), 0);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          <DollarSign className="w-3 h-3 inline mr-1" />Budget
        </div>
        <span className="text-xs font-bold text-gray-700">{allocated.toLocaleString('de-DE')}€
          <span className="text-gray-400 font-normal"> / {totalBudget.toLocaleString('de-DE')}€</span>
        </span>
      </div>
      <div className="flex h-5 rounded-lg overflow-hidden bg-gray-100">
        {workPackages.map(wp => {
          const pct = totalBudget > 0 ? ((wp.budget || 0) / totalBudget) * 100 : 0;
          if (pct < 1) return null;
          const s = getStyle(wp);
          return (
            <div
              key={wp.number}
              className={`bg-gradient-to-b ${s.gradient} flex items-center justify-center border-r border-white/20`}
              style={{ width: `${pct}%` }}
              title={`WP${wp.number}: ${(wp.budget || 0).toLocaleString('de-DE')}€ (${pct.toFixed(0)}%)`}
            >
              <span className="text-[7px] text-white font-bold">{pct > 7 ? `WP${wp.number}` : ''}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
        {workPackages.map(wp => {
          const pct = totalBudget > 0 ? ((wp.budget || 0) / totalBudget) * 100 : 0;
          const s = getStyle(wp);
          return (
            <span key={wp.number} className="text-[9px] text-gray-500 flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${s.gradient} inline-block`} />
              WP{wp.number}: {(wp.budget || 0).toLocaleString('de-DE')}€ ({pct.toFixed(0)}%)
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// WP CARD
// ============================================================================

function WPCard({
  wp,
  wpIndex,
  wpConfig,
  pipelineState,
  onUpdateAnswer,
  onUpdateWorkPackage,
  language,
  defaultExpanded,
}: {
  wp: WorkPackage;
  wpIndex: number;
  wpConfig?: WPConfiguration;
  pipelineState: PipelineState;
  onUpdateAnswer: (questionId: string, value: string) => void;
  onUpdateWorkPackage: (wpIndex: number, updates: Partial<WorkPackage>) => void;
  language: string;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const s = getStyle(wp, wpConfig);
  const dur = parseDuration(wp);
  const months = dur.end - dur.start + 1;

  // Smart extraction
  const activities = extractActivities(wp, wpConfig, pipelineState, language);
  const deliverables = extractDeliverables(wp, wpConfig, language);

  // Lead
  const leadName = (() => {
    const leadId = wp.lead || wpConfig?.leadPartnerId;
    if (!leadId) return '–';
    const found = pipelineState.consortium.find(p => p.id === leadId || p.name === leadId);
    return found?.name || leadId;
  })();

  // Partner count
  const partnerCount = wp.partnerRoles?.length || 0;

  return (
    <div className={`bg-white rounded-xl border ${s.border} shadow-sm hover:shadow-md transition-all print:shadow-none print:break-inside-avoid overflow-hidden`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${s.gradient} px-3 py-2`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">{s.icon}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold text-sm">WP{wp.number}</span>
                <span className="text-white/50 text-[9px]">{s.label}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="bg-white/15 text-white text-[9px] px-1.5 py-0.5 rounded-full">M{dur.start}–{dur.end}</span>
            {wp.budget ? (
              <span className="bg-white/15 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {wp.budget.toLocaleString('de-DE')}€
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <h4 className="font-semibold text-[13px] text-gray-800 leading-snug">
          <InlineEdit
            value={strip(wp.title)}
            onSave={v => onUpdateWorkPackage(wpIndex, { title: v })}
          />
        </h4>

        {/* Meta row */}
        <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
          <span className="inline-flex items-center gap-0.5 font-medium text-gray-700">
            <Users className="w-3 h-3" /> {leadName}
          </span>
          <span className="text-gray-300">|</span>
          <span><Clock className="w-3 h-3 inline" /> {months}M</span>
          {partnerCount > 1 && (
            <>
              <span className="text-gray-300">|</span>
              <span>{partnerCount} Partner</span>
            </>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* Activities */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3" /> Aktivitäten
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.accent}`}>
              {activities.length}
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="text-[11px] text-gray-400 italic py-2 text-center">
              Keine Aktivitäten konfiguriert
            </div>
          ) : (
            <div className="space-y-1">
              {(expanded ? activities : activities.slice(0, 4)).map((act) => (
                <div key={act.id} className={`flex items-start gap-1.5 ${s.bg} rounded-lg px-2 py-1.5`}>
                  <span className={`text-[9px] font-bold text-white bg-gradient-to-r ${s.gradient} px-1 py-0.5 rounded shrink-0 mt-0.5`}>
                    {act.code}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1">
                      <span className="text-xs text-gray-700 font-medium leading-snug">
                        <InlineEdit
                          value={act.title}
                          onSave={v => {
                            // Update in wpConfig if available
                            const newActs = [...(wp.activities || [])];
                            const actIdx = parseInt(act.code.split('.')[1]) - 1;
                            if (newActs[actIdx]) {
                              newActs[actIdx] = { ...newActs[actIdx], title: v };
                              onUpdateWorkPackage(wpIndex, { activities: newActs });
                            }
                          }}
                        />
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-gray-400">{CATEGORY_ICONS[act.category] || '📌'} {act.timing}</span>
                      {act.isMandatory && (
                        <span className="text-[8px] bg-red-50 text-red-500 px-1 rounded font-medium">pflicht</span>
                      )}
                      {act.responsible && (
                        <span className="text-[9px] text-gray-400">{act.responsible}</span>
                      )}
                    </div>
                    {expanded && act.description && (
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{act.description}</p>
                    )}
                  </div>
                </div>
              ))}
              {!expanded && activities.length > 4 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="w-full text-[10px] text-blue-500 hover:text-blue-700 py-1 print:hidden"
                >
                  +{activities.length - 4} weitere anzeigen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Deliverables */}
        {deliverables.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
                <Package className="w-3 h-3" /> Ergebnisse
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {deliverables.length}
              </span>
            </div>
            <div className="space-y-0.5">
              {(expanded ? deliverables : deliverables.slice(0, 3)).map(del => (
                <div key={del.id} className="flex items-center gap-1.5 text-[11px] py-0.5">
                  <FileText className="w-3 h-3 text-gray-300 shrink-0" />
                  <span className="text-gray-700">
                    <InlineEdit
                      value={del.title}
                      onSave={v => {
                        const newDels = [...(wp.deliverables || [])];
                        const delIdx = deliverables.indexOf(del);
                        if (newDels[delIdx]) {
                          newDels[delIdx] = { ...newDels[delIdx], title: v };
                          onUpdateWorkPackage(wpIndex, { deliverables: newDels });
                        }
                      }}
                    />
                  </span>
                  <span className="text-[9px] text-gray-400 ml-auto shrink-0 capitalize">{del.type}</span>
                </div>
              ))}
              {!expanded && deliverables.length > 3 && (
                <div className="text-[10px] text-gray-400 text-center">+{deliverables.length - 3} weitere</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-3 py-1.5 ${s.bg} border-t ${s.border} flex items-center justify-center gap-1 text-[10px] font-medium text-gray-500 hover:text-gray-700 transition-colors print:hidden`}
      >
        {expanded ? (
          <><ChevronUp className="w-3 h-3" /> Kompaktansicht</>
        ) : (
          <><ChevronDown className="w-3 h-3" /> Details anzeigen</>
        )}
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WorkPackageOverview({
  pipelineState,
  wpConfigurations: wpConfigs,
  onUpdateAnswer,
  onUpdateWorkPackage,
  language,
  onClose,
}: WorkPackageOverviewProps) {
  const [showTimeline, setShowTimeline] = useState(true);
  const [allExpanded, setAllExpanded] = useState(false);

  const workPackages = pipelineState.workPackages || [];
  const totalBudget = pipelineState.configuration?.totalBudget || 250000;
  const duration = pipelineState.configuration?.duration || 24;

  if (workPackages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Layers className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium">Noch keine Arbeitspakete generiert</p>
        <p className="text-sm mt-1">Generiere zuerst die Arbeitspakete in Schritt 6</p>
      </div>
    );
  }

  // Stats
  const totalActivities = workPackages.reduce((sum, wp) => {
    const cfg = wpConfigs?.find(c => c.wpNumber === wp.number);
    return sum + extractActivities(wp, cfg, pipelineState, language).length;
  }, 0);
  const totalDeliverables = workPackages.reduce((sum, wp) => {
    const cfg = wpConfigs?.find(c => c.wpNumber === wp.number);
    return sum + extractDeliverables(wp, cfg, language).length;
  }, 0);

  const gridCols = workPackages.length <= 3
    ? 'lg:grid-cols-3'
    : workPackages.length <= 4
      ? 'md:grid-cols-2 xl:grid-cols-4'
      : 'md:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="wp-overview-print space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            WP-Dashboard
          </h2>
          <p className="text-[11px] text-gray-400">
            {strip(pipelineState.projectTitle || 'Projekt')}
            {pipelineState.acronym ? ` (${pipelineState.acronym})` : ''}
            {' · '}{workPackages.length} WPs · {totalActivities} Aktivitäten · {totalDeliverables} Ergebnisse
          </p>
        </div>
        <div className="flex items-center gap-1.5 print:hidden">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium ${showTimeline ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}
          >
            <Calendar className="w-3 h-3 inline mr-0.5" />Zeitplan
          </button>
          <button
            onClick={() => setAllExpanded(!allExpanded)}
            className="px-2 py-1 rounded-lg text-[11px] font-medium bg-gray-100 text-gray-500 hover:bg-gray-200"
          >
            {allExpanded ? <Minimize2 className="w-3 h-3 inline mr-0.5" /> : <Maximize2 className="w-3 h-3 inline mr-0.5" />}
            {allExpanded ? 'Kompakt' : 'Alle Details'}
          </button>
          <button
            onClick={() => window.print()}
            className="px-2 py-1 rounded-lg text-[11px] font-medium bg-gray-100 text-gray-500 hover:bg-gray-200"
          >
            <Printer className="w-3 h-3 inline mr-0.5" />Drucken
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Top summary */}
      <div className={`grid gap-3 ${showTimeline ? 'lg:grid-cols-2' : ''}`}>
        <BudgetBar workPackages={workPackages} totalBudget={totalBudget} />
        {showTimeline && <Timeline workPackages={workPackages} duration={duration} />}
      </div>

      {/* WP Cards */}
      <div className={`grid grid-cols-1 ${gridCols} gap-3 print:grid-cols-2`}>
        {workPackages.map((wp, idx) => {
          const cfg = wpConfigs?.find(c => c.wpNumber === wp.number);
          return (
            <WPCard
              key={wp.number}
              wp={wp}
              wpIndex={idx}
              wpConfig={cfg}
              pipelineState={pipelineState}
              onUpdateAnswer={onUpdateAnswer}
              onUpdateWorkPackage={onUpdateWorkPackage}
              language={language}
              defaultExpanded={allExpanded}
            />
          );
        })}
      </div>

      {/* Print footer */}
      <div className="hidden print:block mt-4 pt-2 border-t border-gray-300 text-[9px] text-gray-400 text-center">
        {pipelineState.projectTitle} · WP-Dashboard · {new Date().toLocaleDateString('de-DE')}
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .wp-overview-print, .wp-overview-print * { visibility: visible; }
          .wp-overview-print {
            position: absolute;
            left: 0; top: 0;
            width: 100%;
            padding: 8mm;
            font-size: 9px;
          }
          @page { size: A4 landscape; margin: 6mm; }
          .wp-overview-print .grid > div { break-inside: avoid; }
          .print\\:hidden { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
