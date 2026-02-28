'use client';

import React, { useState, useRef } from 'react';
import {
  PipelineState,
  WorkPackage,
  AnswerData,
} from '@/lib/project-pipeline';
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
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface WorkPackageOverviewProps {
  pipelineState: PipelineState;
  onUpdateAnswer: (questionId: string, value: string) => void;
  onUpdateWorkPackage: (wpIndex: number, updates: Partial<WorkPackage>) => void;
  language: string;
  onClose?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Strip markdown formatting like **bold**, *italic*, bullet points etc. */
function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*([^*]+)\*/g, '$1')        // *italic* → italic
    .replace(/^#+\s*/gm, '')               // # headings
    .replace(/^[-*•]\s*/gm, '')            // bullet points
    .replace(/^\d+\.\s*/gm, '')            // numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [links](url) → links
    .replace(/`([^`]+)`/g, '$1')           // `code` → code
    .replace(/\n{2,}/g, '\n')              // multiple newlines
    .trim();
}

/** Extract first meaningful sentence (max ~80 chars) from a text block */
function extractShortSummary(text: string, maxLen = 80): string {
  const clean = stripMarkdown(text);
  const firstSentence = clean.split(/[.!?]\s/)[0];
  if (firstSentence.length <= maxLen) return firstSentence;
  return firstSentence.substring(0, maxLen).replace(/\s\S*$/, '') + '…';
}

// ============================================================================
// WP TYPE CONFIG
// ============================================================================

const WP_TYPE_CONFIG: Record<string, { gradient: string; bg: string; border: string; icon: string; label: string }> = {
  MANAGEMENT:    { gradient: 'from-slate-500 to-slate-700',     bg: 'bg-slate-50',    border: 'border-slate-200',    icon: '📋', label: 'Management' },
  RESEARCH:      { gradient: 'from-blue-500 to-blue-700',       bg: 'bg-blue-50',     border: 'border-blue-200',     icon: '🔬', label: 'Research' },
  DEVELOPMENT:   { gradient: 'from-indigo-500 to-indigo-700',   bg: 'bg-indigo-50',   border: 'border-indigo-200',   icon: '⚙️', label: 'Development' },
  PILOTING:      { gradient: 'from-emerald-500 to-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200',  icon: '🧪', label: 'Piloting' },
  DISSEMINATION: { gradient: 'from-amber-500 to-amber-700',     bg: 'bg-amber-50',    border: 'border-amber-200',    icon: '📢', label: 'Dissemination' },
  QUALITY:       { gradient: 'from-purple-500 to-purple-700',   bg: 'bg-purple-50',   border: 'border-purple-200',   icon: '✅', label: 'Quality' },
  OTHER:         { gradient: 'from-gray-500 to-gray-700',       bg: 'bg-gray-50',     border: 'border-gray-200',     icon: '📦', label: 'Sonstige' },
};

function detectWPType(wp: WorkPackage, wpConfig?: any): string {
  if (wpConfig?.type) return wpConfig.type;
  const t = wp.title.toLowerCase();
  if (t.includes('management') || t.includes('koordin') || t.includes('projektmanagement')) return 'MANAGEMENT';
  if (t.includes('research') || t.includes('forschung') || t.includes('analyse') || t.includes('needs')) return 'RESEARCH';
  if (t.includes('develop') || t.includes('entwickl') || t.includes('creation') || t.includes('erstellung') || t.includes('design')) return 'DEVELOPMENT';
  if (t.includes('pilot') || t.includes('testing') || t.includes('erprobung') || t.includes('implementation') || t.includes('implementierung')) return 'PILOTING';
  if (t.includes('dissem') || t.includes('verbreit') || t.includes('exploit') || t.includes('valoris') || t.includes('communication')) return 'DISSEMINATION';
  if (t.includes('quality') || t.includes('qualit') || t.includes('evaluation')) return 'QUALITY';
  return 'OTHER';
}

function parseDuration(wp: WorkPackage): { start: number; end: number } {
  if (typeof wp.duration === 'object' && wp.duration) return wp.duration;
  if (typeof wp.duration === 'string') {
    const m = wp.duration.match(/M?(\d+)\s*[-–]\s*M?(\d+)/);
    if (m) return { start: parseInt(m[1]), end: parseInt(m[2]) };
  }
  return { start: 1, end: 24 };
}

// ============================================================================
// INLINE EDIT COMPONENT (compact)
// ============================================================================

function InlineEdit({ value, onSave, className = '' }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { onSave(text); setEditing(false); }
            if (e.key === 'Escape') { setText(value); setEditing(false); }
          }}
          onBlur={() => { if (text !== value) onSave(text); setEditing(false); }}
          className={`px-1.5 py-0.5 border border-blue-400 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 w-full ${className}`}
        />
      </div>
    );
  }

  return (
    <span
      className={`cursor-pointer hover:bg-yellow-50 rounded px-0.5 transition-colors group inline-flex items-center gap-0.5 ${className}`}
      onClick={() => { setText(value); setEditing(true); }}
      title="Klicken zum Bearbeiten"
    >
      {value || '–'}
      <Edit3 className="w-2.5 h-2.5 text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity print:hidden shrink-0" />
    </span>
  );
}

// ============================================================================
// TIMELINE BAR (compact)
// ============================================================================

function TimelineBar({ workPackages, duration }: { workPackages: WorkPackage[]; duration: number }) {
  const totalMonths = duration || 24;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm print:shadow-none">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
        <Calendar className="w-3 h-3" /> Zeitplan
      </div>
      <div className="space-y-1">
        {/* Month labels */}
        <div className="flex ml-16">
          {Array.from({ length: Math.ceil(totalMonths / 3) }, (_, i) => (
            <div key={i} style={{ width: `${(3 / totalMonths) * 100}%` }} className="text-[8px] text-gray-300 text-center">
              M{i * 3 + 1}
            </div>
          ))}
        </div>
        {workPackages.map(wp => {
          const d = parseDuration(wp);
          const left = ((d.start - 1) / totalMonths) * 100;
          const width = ((d.end - d.start + 1) / totalMonths) * 100;
          const wpType = detectWPType(wp);
          const cfg = WP_TYPE_CONFIG[wpType] || WP_TYPE_CONFIG.OTHER;

          return (
            <div key={wp.number} className="flex items-center h-5">
              <div className="w-16 text-[10px] font-medium text-gray-500 truncate pr-1">
                WP{wp.number}
              </div>
              <div className="flex-1 relative h-4 bg-gray-50 rounded-full">
                <div
                  className={`absolute h-full rounded-full bg-gradient-to-r ${cfg.gradient} flex items-center justify-center`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }}
                >
                  <span className="text-[7px] text-white font-bold">M{d.start}–{d.end}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// WP CARD (clean, compact)
// ============================================================================

function WPCard({
  wp,
  wpIndex,
  pipelineState,
  onUpdateAnswer,
  onUpdateWorkPackage,
}: {
  wp: WorkPackage;
  wpIndex: number;
  pipelineState: PipelineState;
  onUpdateAnswer: (questionId: string, value: string) => void;
  onUpdateWorkPackage: (wpIndex: number, updates: Partial<WorkPackage>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const wpType = detectWPType(wp);
  const cfg = WP_TYPE_CONFIG[wpType] || WP_TYPE_CONFIG.OTHER;
  const dur = parseDuration(wp);
  const durationMonths = dur.end - dur.start + 1;

  const leadPartnerName = (() => {
    if (!wp.lead) return '–';
    const found = pipelineState.consortium.find(p => p.id === wp.lead || p.name === wp.lead);
    return found?.name || wp.lead;
  })();

  // Get involved partners from partnerRoles
  const involvedPartners = wp.partnerRoles?.map(pr => pr.partner).filter(p => p !== leadPartnerName) || [];

  return (
    <div className={`bg-white rounded-xl border ${cfg.border} shadow-sm hover:shadow-md transition-shadow print:shadow-none print:break-inside-avoid overflow-hidden`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${cfg.gradient} px-3 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">{cfg.icon}</span>
          <div className="min-w-0">
            <span className="text-white font-bold text-xs">WP{wp.number}</span>
            <span className="text-white/60 text-[9px] ml-1.5">{cfg.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-white/20 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
            M{dur.start}–{dur.end}
          </span>
          {wp.budget && wp.budget > 0 && (
            <span className="bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {wp.budget.toLocaleString('de-DE')}€
            </span>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Title */}
        <h4 className="font-semibold text-sm text-gray-800 leading-snug">
          <InlineEdit
            value={stripMarkdown(wp.title)}
            onSave={v => onUpdateWorkPackage(wpIndex, { title: v })}
          />
        </h4>

        {/* Lead + Duration row */}
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span className="font-medium text-gray-700">{leadPartnerName}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {durationMonths} Monate
          </span>
        </div>

        {/* Involved partners (compact chips) */}
        {involvedPartners.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {involvedPartners.slice(0, expanded ? undefined : 4).map((p, i) => (
              <span key={i} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                {p}
              </span>
            ))}
            {!expanded && involvedPartners.length > 4 && (
              <span className="text-[9px] text-gray-400">+{involvedPartners.length - 4}</span>
            )}
          </div>
        )}

        {/* Divider */}
        <hr className="border-gray-100" />

        {/* Activities - clean list */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Aktivitäten ({wp.activities?.length || 0})
          </div>
          <div className="space-y-1">
            {(expanded ? wp.activities : wp.activities?.slice(0, 5))?.map((act, i) => {
              const cleanTitle = stripMarkdown(act.title);
              const shortTitle = cleanTitle.length > 100 ? cleanTitle.substring(0, 100).replace(/\s\S*$/, '') + '…' : cleanTitle;

              return (
                <div key={act.id || i} className={`flex items-start gap-1.5 text-xs ${cfg.bg} rounded-lg px-2 py-1.5`}>
                  <span className={`text-[9px] font-bold text-white bg-gradient-to-r ${cfg.gradient} px-1 py-0.5 rounded shrink-0 mt-0.5`}>
                    A{wp.number}.{i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <InlineEdit
                      value={shortTitle}
                      onSave={v => {
                        const newActs = [...(wp.activities || [])];
                        newActs[i] = { ...newActs[i], title: v };
                        onUpdateWorkPackage(wpIndex, { activities: newActs });
                      }}
                      className="text-gray-700 text-xs"
                    />
                    {act.month && (
                      <span className="text-[9px] text-gray-400 ml-1">
                        {typeof act.month === 'object' ? `M${act.month.start}–${act.month.end}` : act.month}
                      </span>
                    )}
                    {expanded && act.responsible && (
                      <div className="text-[9px] text-gray-400 mt-0.5">
                        {act.responsible}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {!expanded && (wp.activities?.length || 0) > 5 && (
              <div className="text-[10px] text-gray-400 text-center">
                +{wp.activities!.length - 5} weitere
              </div>
            )}
          </div>
        </div>

        {/* Deliverables - clean list */}
        {wp.deliverables && wp.deliverables.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 flex items-center gap-1">
              <Package className="w-3 h-3" />
              Ergebnisse ({wp.deliverables.length})
            </div>
            <div className="space-y-1">
              {(expanded ? wp.deliverables : wp.deliverables.slice(0, 3)).map((del, i) => (
                <div key={del.id || i} className="flex items-start gap-1.5 text-xs">
                  <FileText className="w-3 h-3 text-gray-300 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <InlineEdit
                      value={stripMarkdown(del.title).length > 80 ? stripMarkdown(del.title).substring(0, 80) + '…' : stripMarkdown(del.title)}
                      onSave={v => {
                        const newDels = [...(wp.deliverables || [])];
                        newDels[i] = { ...newDels[i], title: v };
                        onUpdateWorkPackage(wpIndex, { deliverables: newDels });
                      }}
                      className="text-gray-600 text-xs"
                    />
                    <div className="flex gap-2 text-[9px] text-gray-400">
                      {del.type && <span className="capitalize">{del.type}</span>}
                      {del.dueMonth && <span>M{del.dueMonth}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {!expanded && wp.deliverables.length > 3 && (
                <div className="text-[10px] text-gray-400 text-center">+{wp.deliverables.length - 3} weitere</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`px-3 py-1.5 ${cfg.bg} border-t ${cfg.border} flex items-center justify-between`}>
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          <span>{wp.activities?.length || 0} Akt.</span>
          <span>{wp.deliverables?.length || 0} Erg.</span>
          <span>{durationMonths}M</span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-blue-500 hover:text-blue-700 font-medium flex items-center gap-0.5 print:hidden"
        >
          {expanded ? <><Minimize2 className="w-3 h-3" /> weniger</> : <><Maximize2 className="w-3 h-3" /> mehr</>}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// BUDGET BAR (compact)
// ============================================================================

function BudgetBar({ workPackages, totalBudget }: { workPackages: WorkPackage[]; totalBudget: number }) {
  const allocated = workPackages.reduce((s, wp) => s + (wp.budget || 0), 0);
  const pct = totalBudget > 0 ? (allocated / totalBudget) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm print:shadow-none">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <DollarSign className="w-3 h-3" /> Budget
        </div>
        <div className="text-xs">
          <span className="font-bold text-gray-700">{allocated.toLocaleString('de-DE')}€</span>
          <span className="text-gray-400"> / {totalBudget.toLocaleString('de-DE')}€</span>
        </div>
      </div>
      <div className="flex h-6 rounded-lg overflow-hidden bg-gray-100">
        {workPackages.map(wp => {
          const wpPct = totalBudget > 0 ? ((wp.budget || 0) / totalBudget) * 100 : 0;
          if (wpPct < 1) return null;
          const cfg = WP_TYPE_CONFIG[detectWPType(wp)] || WP_TYPE_CONFIG.OTHER;
          return (
            <div
              key={wp.number}
              className={`bg-gradient-to-b ${cfg.gradient} flex items-center justify-center border-r border-white/20`}
              style={{ width: `${wpPct}%` }}
              title={`WP${wp.number}: ${(wp.budget || 0).toLocaleString('de-DE')}€`}
            >
              <span className="text-[8px] text-white font-bold">{wpPct > 6 ? `WP${wp.number}` : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WorkPackageOverview({
  pipelineState,
  onUpdateAnswer,
  onUpdateWorkPackage,
  language,
  onClose,
}: WorkPackageOverviewProps) {
  const [showTimeline, setShowTimeline] = useState(true);

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

  // Grid columns based on WP count
  const gridCols = workPackages.length <= 3
    ? 'grid-cols-1 lg:grid-cols-3'
    : workPackages.length <= 4
      ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
      : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="wp-overview-print space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            WP-Dashboard
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {pipelineState.projectTitle || 'Projekt'}
            {pipelineState.acronym ? ` (${pipelineState.acronym})` : ''}
            {' · '}{workPackages.length} WPs · {duration} Monate
          </p>
        </div>
        <div className="flex items-center gap-1.5 print:hidden">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${showTimeline ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}
          >
            <Calendar className="w-3 h-3 inline mr-0.5" />Zeitplan
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

      {/* Top bars */}
      <div className={`grid gap-3 ${showTimeline ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        <BudgetBar workPackages={workPackages} totalBudget={totalBudget} />
        {showTimeline && <TimelineBar workPackages={workPackages} duration={duration} />}
      </div>

      {/* WP Cards */}
      <div className={`grid ${gridCols} gap-3`}>
        {workPackages.map((wp, idx) => (
          <WPCard
            key={wp.number}
            wp={wp}
            wpIndex={idx}
            pipelineState={pipelineState}
            onUpdateAnswer={onUpdateAnswer}
            onUpdateWorkPackage={onUpdateWorkPackage}
          />
        ))}
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
