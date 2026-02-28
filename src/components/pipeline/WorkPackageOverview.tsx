'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  PipelineState,
  WorkPackage,
  Activity,
  Deliverable,
  AnswerData,
  ConsortiumPartner,
} from '@/lib/project-pipeline';
import {
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  FileText,
  Layers,
  Maximize2,
  Minimize2,
  Package,
  Printer,
  Save,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
  GripVertical,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
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

interface EditableFieldProps {
  value: string;
  onSave: (newValue: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}

// ============================================================================
// WP TYPE COLORS & ICONS
// ============================================================================

const WP_TYPE_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string; gradient: string }> = {
  MANAGEMENT: {
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    icon: '📋',
    gradient: 'from-slate-500 to-slate-700',
  },
  RESEARCH: {
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    icon: '🔬',
    gradient: 'from-blue-500 to-blue-700',
  },
  DEVELOPMENT: {
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-300',
    icon: '⚙️',
    gradient: 'from-indigo-500 to-indigo-700',
  },
  PILOTING: {
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    icon: '🧪',
    gradient: 'from-emerald-500 to-emerald-700',
  },
  DISSEMINATION: {
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    icon: '📢',
    gradient: 'from-amber-500 to-amber-700',
  },
  QUALITY: {
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    icon: '✅',
    gradient: 'from-purple-500 to-purple-700',
  },
  OTHER: {
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    icon: '📦',
    gradient: 'from-gray-500 to-gray-700',
  },
};

function getWPType(wp: WorkPackage, wpConfig?: any): string {
  if (wpConfig?.type) return wpConfig.type;
  const title = wp.title.toLowerCase();
  if (title.includes('management') || title.includes('koordin') || title.includes('projektmanagement')) return 'MANAGEMENT';
  if (title.includes('research') || title.includes('forschung') || title.includes('analyse') || title.includes('needs')) return 'RESEARCH';
  if (title.includes('develop') || title.includes('entwickl') || title.includes('creation') || title.includes('erstellung')) return 'DEVELOPMENT';
  if (title.includes('pilot') || title.includes('testing') || title.includes('erprobung') || title.includes('implementation')) return 'PILOTING';
  if (title.includes('dissem') || title.includes('verbreit') || title.includes('exploit') || title.includes('valoris')) return 'DISSEMINATION';
  if (title.includes('quality') || title.includes('qualit') || title.includes('evaluation')) return 'QUALITY';
  return 'OTHER';
}

// ============================================================================
// EDITABLE FIELD COMPONENT
// ============================================================================

function EditableField({ value, onSave, multiline = false, placeholder, className = '', maxLength }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const handleStartEdit = () => {
    setEditValue(value);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="relative group">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            maxLength={maxLength}
            className={`w-full p-2 text-sm border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y min-h-[60px] ${className}`}
            placeholder={placeholder}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            maxLength={maxLength}
            className={`w-full p-1.5 text-sm border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 ${className}`}
            placeholder={placeholder}
          />
        )}
        <div className="absolute -top-6 right-0 flex gap-1 print:hidden">
          <button onClick={handleSave} className="p-0.5 bg-green-500 text-white rounded text-xs hover:bg-green-600">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={handleCancel} className="p-0.5 bg-red-500 text-white rounded text-xs hover:bg-red-600">
            <X className="w-3 h-3" />
          </button>
        </div>
        {maxLength && (
          <div className={`text-[10px] mt-0.5 text-right ${editValue.length > maxLength * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
            {editValue.length}/{maxLength}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`cursor-pointer group hover:bg-blue-50/50 rounded px-1 -mx-1 transition-colors print:hover:bg-transparent ${className}`}
      onClick={handleStartEdit}
      title="Klicken zum Bearbeiten"
    >
      <span className={value ? '' : 'text-gray-400 italic'}>{value || placeholder || '–'}</span>
      <Edit3 className="w-3 h-3 text-blue-400 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden" />
    </div>
  );
}

// ============================================================================
// TIMELINE BAR
// ============================================================================

function TimelineBar({ workPackages, duration }: { workPackages: WorkPackage[]; duration: number }) {
  const totalMonths = duration || 24;
  const monthWidth = 100 / totalMonths;

  return (
    <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm print:shadow-none print:border-gray-300">
      <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Zeitplan / Timeline
      </h3>
      <div className="relative">
        {/* Month markers */}
        <div className="flex text-[9px] text-gray-400 mb-1">
          {Array.from({ length: totalMonths }, (_, i) => (
            <div key={i} style={{ width: `${monthWidth}%` }} className="text-center">
              {i + 1}
            </div>
          ))}
        </div>
        {/* WP bars */}
        <div className="space-y-1.5">
          {workPackages.map((wp) => {
            const dur = typeof wp.duration === 'object' && wp.duration
              ? wp.duration
              : typeof wp.duration === 'string'
                ? (() => {
                    const m = wp.duration.match(/M?(\d+)\s*[-–]\s*M?(\d+)/);
                    return m ? { start: parseInt(m[1]), end: parseInt(m[2]) } : { start: 1, end: totalMonths };
                  })()
                : { start: 1, end: totalMonths };

            const left = ((dur.start - 1) / totalMonths) * 100;
            const width = ((dur.end - dur.start + 1) / totalMonths) * 100;
            const wpType = getWPType(wp);
            const config = WP_TYPE_CONFIG[wpType] || WP_TYPE_CONFIG.OTHER;

            return (
              <div key={wp.number} className="relative h-6 flex items-center">
                <div className="absolute left-0 w-10 text-[10px] font-medium text-gray-500">
                  WP{wp.number}
                </div>
                <div className="ml-10 relative w-full h-5">
                  <div
                    className={`absolute h-full rounded-full bg-gradient-to-r ${config.gradient} opacity-85 flex items-center justify-center`}
                    style={{ left: `${left}%`, width: `${Math.max(width, 3)}%` }}
                  >
                    <span className="text-[8px] text-white font-medium truncate px-1">
                      M{dur.start}–M{dur.end}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BUDGET OVERVIEW BAR
// ============================================================================

function BudgetOverview({ workPackages, totalBudget }: { workPackages: WorkPackage[]; totalBudget: number }) {
  const wpBudgets = workPackages.map(wp => ({
    number: wp.number,
    title: wp.title,
    budget: wp.budget || 0,
    type: getWPType(wp),
  }));
  const allocatedBudget = wpBudgets.reduce((sum, wp) => sum + wp.budget, 0);
  const budgetPercent = totalBudget > 0 ? (allocatedBudget / totalBudget) * 100 : 0;

  return (
    <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm print:shadow-none print:border-gray-300">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Budget-Verteilung
        </h3>
        <div className="text-sm">
          <span className="font-bold text-gray-800">{allocatedBudget.toLocaleString('de-DE')}€</span>
          <span className="text-gray-400"> / {totalBudget.toLocaleString('de-DE')}€</span>
          <span className={`ml-2 text-xs font-medium ${budgetPercent > 100 ? 'text-red-600' : budgetPercent > 90 ? 'text-amber-600' : 'text-green-600'}`}>
            ({budgetPercent.toFixed(0)}%)
          </span>
        </div>
      </div>
      {/* Budget bar */}
      <div className="flex h-8 rounded-lg overflow-hidden border border-gray-200">
        {wpBudgets.map((wp) => {
          const pct = totalBudget > 0 ? (wp.budget / totalBudget) * 100 : 0;
          if (pct < 1) return null;
          const config = WP_TYPE_CONFIG[wp.type] || WP_TYPE_CONFIG.OTHER;
          return (
            <div
              key={wp.number}
              className={`bg-gradient-to-b ${config.gradient} flex items-center justify-center border-r border-white/30 transition-all hover:opacity-90`}
              style={{ width: `${pct}%` }}
              title={`WP${wp.number}: ${wp.budget.toLocaleString('de-DE')}€ (${pct.toFixed(1)}%)`}
            >
              <span className="text-[9px] text-white font-bold">
                {pct > 5 ? `WP${wp.number}` : ''}
              </span>
            </div>
          );
        })}
        {budgetPercent < 100 && (
          <div
            className="bg-gray-100 flex items-center justify-center"
            style={{ width: `${100 - budgetPercent}%` }}
          >
            <span className="text-[9px] text-gray-400">frei</span>
          </div>
        )}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {wpBudgets.map((wp) => {
          const config = WP_TYPE_CONFIG[wp.type] || WP_TYPE_CONFIG.OTHER;
          return (
            <div key={wp.number} className="flex items-center gap-1 text-[10px] text-gray-600">
              <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${config.gradient}`} />
              WP{wp.number}: {wp.budget.toLocaleString('de-DE')}€
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// WP CARD COMPONENT
// ============================================================================

function WPCard({
  wp,
  wpConfig,
  pipelineState,
  onUpdateAnswer,
  onUpdateWorkPackage,
  wpIndex,
  isExpanded,
  onToggleExpand,
  language,
}: {
  wp: WorkPackage;
  wpConfig?: any;
  pipelineState: PipelineState;
  onUpdateAnswer: (questionId: string, value: string) => void;
  onUpdateWorkPackage: (wpIndex: number, updates: Partial<WorkPackage>) => void;
  wpIndex: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  language: string;
}) {
  const wpType = getWPType(wp, wpConfig);
  const config = WP_TYPE_CONFIG[wpType] || WP_TYPE_CONFIG.OTHER;

  // Parse duration
  const dur = typeof wp.duration === 'object' && wp.duration
    ? wp.duration
    : typeof wp.duration === 'string'
      ? (() => {
          const m = wp.duration.match(/M?(\d+)\s*[-–]\s*M?(\d+)/);
          return m ? { start: parseInt(m[1]), end: parseInt(m[2]) } : { start: 1, end: 24 };
        })()
      : { start: 1, end: 24 };

  const durationMonths = dur.end - dur.start + 1;

  // Get WP-specific answers
  const getAnswer = (key: string): string => {
    const ans = pipelineState.answers?.[key];
    if (!ans) return '';
    if (typeof ans === 'string') return ans;
    if (typeof ans === 'object' && 'value' in ans) return (ans as AnswerData).value || '';
    return '';
  };

  const wpDescription = getAnswer(`wp_description_wp${wp.number}`) || wp.description || '';
  const wpObjectives = getAnswer(`wp_objectives_wp${wp.number}`);
  const wpBudgetRationale = getAnswer(`wp_budget_wp${wp.number}`) || wp.budgetRationale || '';

  // Activity count & types
  const activityTypes = wp.activities?.map(a => a.type || 'General') || [];
  const uniqueTypes = [...new Set(activityTypes)];

  // Deliverable summary
  const deliverableCount = wp.deliverables?.length || 0;

  // Lead partner
  const leadPartner = wp.lead || wpConfig?.leadPartnerId || '';
  const leadPartnerName = pipelineState.consortium.find(p => p.id === leadPartner || p.name === leadPartner)?.name || leadPartner;

  return (
    <div className={`bg-white rounded-xl border-2 ${config.border} shadow-md hover:shadow-lg transition-all print:shadow-none print:break-inside-avoid overflow-hidden`}>
      {/* Card Header - Gradient bar */}
      <div className={`bg-gradient-to-r ${config.gradient} px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <div>
            <div className="text-white font-bold text-sm">WP{wp.number}</div>
            <div className="text-white/80 text-[10px] uppercase tracking-wider">{wpType}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/20 rounded-full px-2 py-0.5 text-[10px] text-white font-medium">
            M{dur.start}–M{dur.end} ({durationMonths}M)
          </div>
          {wp.budget && wp.budget > 0 && (
            <div className="bg-white/20 rounded-full px-2 py-0.5 text-[10px] text-white font-bold">
              {wp.budget.toLocaleString('de-DE')}€
            </div>
          )}
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-white/20 rounded-full transition-colors print:hidden"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-white" /> : <Maximize2 className="w-3.5 h-3.5 text-white" />}
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        {/* Title - Editable */}
        <div>
          <h3 className="font-bold text-gray-800 text-sm leading-tight">
            <EditableField
              value={wp.title}
              onSave={(newTitle) => {
                onUpdateWorkPackage(wpIndex, { title: newTitle });
              }}
              placeholder="Work Package Titel..."
            />
          </h3>
        </div>

        {/* Lead Partner */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-medium">Lead:</span>
          <span className="text-gray-700 font-semibold">{leadPartnerName}</span>
        </div>

        {/* Partner Roles - compact */}
        {wp.partnerRoles && wp.partnerRoles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {wp.partnerRoles.map((pr, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                <span className="font-medium">{pr.partner.length > 15 ? pr.partner.substring(0, 15) + '…' : pr.partner}</span>
              </span>
            ))}
          </div>
        )}

        {/* Objectives - compact list */}
        {wp.objectives && wp.objectives.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Ziele
            </div>
            <ul className="space-y-0.5">
              {wp.objectives.slice(0, isExpanded ? undefined : 2).map((obj, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                  <EditableField
                    value={obj}
                    onSave={(newObj) => {
                      const newObjectives = [...wp.objectives];
                      newObjectives[i] = newObj;
                      onUpdateWorkPackage(wpIndex, { objectives: newObjectives });
                    }}
                    className="text-xs"
                  />
                </li>
              ))}
              {!isExpanded && wp.objectives.length > 2 && (
                <li className="text-[10px] text-gray-400 ml-4">+{wp.objectives.length - 2} weitere...</li>
              )}
            </ul>
          </div>
        )}

        {/* Activities */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Aktivitäten ({wp.activities?.length || 0})
          </div>
          <div className="space-y-1.5">
            {(isExpanded ? wp.activities : wp.activities?.slice(0, 3))?.map((act, i) => (
              <div key={act.id || i} className={`rounded-lg p-2 ${config.bg} border ${config.border}/50`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[9px] font-bold ${config.color} bg-white px-1 py-0.5 rounded`}>
                        A{wp.number}.{i + 1}
                      </span>
                      {act.type && (
                        <span className="text-[9px] text-gray-400">{act.type}</span>
                      )}
                      {act.month && (
                        <span className="text-[9px] text-gray-400 ml-auto">
                          {typeof act.month === 'object' ? `M${act.month.start}-M${act.month.end}` : act.month}
                        </span>
                      )}
                    </div>
                    <EditableField
                      value={act.title}
                      onSave={(newTitle) => {
                        const newActivities = [...(wp.activities || [])];
                        newActivities[i] = { ...newActivities[i], title: newTitle };
                        onUpdateWorkPackage(wpIndex, { activities: newActivities });
                        // Also update the answer
                        onUpdateAnswer(`wp_act${i + 1}_content_wp${wp.number}`, act.content || newTitle);
                      }}
                      className="text-xs font-medium text-gray-700"
                    />
                    {isExpanded && act.description && (
                      <EditableField
                        value={act.description}
                        onSave={(newDesc) => {
                          const newActivities = [...(wp.activities || [])];
                          newActivities[i] = { ...newActivities[i], description: newDesc };
                          onUpdateWorkPackage(wpIndex, { activities: newActivities });
                        }}
                        multiline
                        className="text-[11px] text-gray-500 mt-1"
                        maxLength={3000}
                      />
                    )}
                    {isExpanded && act.responsible && (
                      <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" /> {act.responsible}
                        {act.participatingPartners && act.participatingPartners.length > 0 && (
                          <span className="text-gray-300">+ {act.participatingPartners.join(', ')}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!isExpanded && (wp.activities?.length || 0) > 3 && (
              <div className="text-[10px] text-gray-400 text-center py-1">
                +{wp.activities!.length - 3} weitere Aktivitäten...
              </div>
            )}
          </div>
        </div>

        {/* Deliverables */}
        {wp.deliverables && wp.deliverables.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1 flex items-center gap-1">
              <Package className="w-3 h-3" /> Ergebnisse ({deliverableCount})
            </div>
            <div className="space-y-1">
              {(isExpanded ? wp.deliverables : wp.deliverables.slice(0, 2)).map((del, i) => (
                <div key={del.id || i} className="flex items-start gap-1.5 text-xs">
                  <FileText className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <EditableField
                      value={del.title}
                      onSave={(newTitle) => {
                        const newDeliverables = [...(wp.deliverables || [])];
                        newDeliverables[i] = { ...newDeliverables[i], title: newTitle };
                        onUpdateWorkPackage(wpIndex, { deliverables: newDeliverables });
                      }}
                      className="text-xs text-gray-700"
                    />
                    <div className="flex gap-2 text-[10px] text-gray-400">
                      <span className="capitalize">{del.type}</span>
                      {del.dueMonth && <span>M{del.dueMonth}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {!isExpanded && wp.deliverables.length > 2 && (
                <div className="text-[10px] text-gray-400 ml-4">+{wp.deliverables.length - 2} weitere...</div>
              )}
            </div>
          </div>
        )}

        {/* Indicators - only expanded */}
        {isExpanded && wp.indicators && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Indikatoren
            </div>
            <div className="grid grid-cols-2 gap-2">
              {wp.indicators.quantitative && wp.indicators.quantitative.length > 0 && (
                <div>
                  <div className="text-[9px] text-gray-400 font-medium mb-0.5">Quantitativ</div>
                  <ul className="space-y-0.5">
                    {wp.indicators.quantitative.map((ind, i) => (
                      <li key={i} className="text-[11px] text-gray-600 flex items-start gap-1">
                        <span className="text-blue-400">•</span>
                        <EditableField
                          value={ind}
                          onSave={(newInd) => {
                            const newIndicators = { ...wp.indicators! };
                            newIndicators.quantitative = [...newIndicators.quantitative];
                            newIndicators.quantitative[i] = newInd;
                            onUpdateWorkPackage(wpIndex, { indicators: newIndicators });
                          }}
                          className="text-[11px]"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {wp.indicators.qualitative && wp.indicators.qualitative.length > 0 && (
                <div>
                  <div className="text-[9px] text-gray-400 font-medium mb-0.5">Qualitativ</div>
                  <ul className="space-y-0.5">
                    {wp.indicators.qualitative.map((ind, i) => (
                      <li key={i} className="text-[11px] text-gray-600 flex items-start gap-1">
                        <span className="text-green-400">•</span>
                        <EditableField
                          value={ind}
                          onSave={(newInd) => {
                            const newIndicators = { ...wp.indicators! };
                            newIndicators.qualitative = [...newIndicators.qualitative];
                            newIndicators.qualitative[i] = newInd;
                            onUpdateWorkPackage(wpIndex, { indicators: newIndicators });
                          }}
                          className="text-[11px]"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description - only expanded */}
        {isExpanded && wpDescription && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Beschreibung
            </div>
            <EditableField
              value={wpDescription}
              onSave={(newDesc) => {
                onUpdateAnswer(`wp_description_wp${wp.number}`, newDesc);
                onUpdateWorkPackage(wpIndex, { description: newDesc });
              }}
              multiline
              className="text-xs text-gray-600"
              maxLength={5000}
            />
          </div>
        )}

        {/* Budget Rationale - only expanded */}
        {isExpanded && wpBudgetRationale && (
          <div className="bg-green-50 rounded-lg p-2 border border-green-200">
            <div className="text-[10px] uppercase tracking-wider text-green-600 font-semibold mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Budget-Begründung
            </div>
            <EditableField
              value={wpBudgetRationale}
              onSave={(newBR) => {
                onUpdateAnswer(`wp_budget_wp${wp.number}`, newBR);
                onUpdateWorkPackage(wpIndex, { budgetRationale: newBR });
              }}
              multiline
              className="text-[11px] text-green-800"
              maxLength={5000}
            />
          </div>
        )}
      </div>

      {/* Card Footer - Quick stats */}
      <div className={`px-4 py-2 ${config.bg} border-t ${config.border}/50 flex items-center justify-between text-[10px] text-gray-500`}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-0.5">
            <Zap className="w-3 h-3" /> {wp.activities?.length || 0} Aktivitäten
          </span>
          <span className="flex items-center gap-0.5">
            <Package className="w-3 h-3" /> {deliverableCount} Ergebnisse
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Clock className="w-3 h-3" /> {durationMonths} Monate
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PARTNER SUMMARY
// ============================================================================

function PartnerSummary({ pipelineState, workPackages }: { pipelineState: PipelineState; workPackages: WorkPackage[] }) {
  // Build partner involvement map
  const partnerMap: Record<string, { leads: number[]; participates: number[]; activities: number }> = {};

  pipelineState.consortium.forEach(p => {
    partnerMap[p.name] = { leads: [], participates: [], activities: 0 };
  });

  workPackages.forEach(wp => {
    // Lead
    const leadName = pipelineState.consortium.find(p => p.id === wp.lead || p.name === wp.lead)?.name || wp.lead || '';
    if (leadName && partnerMap[leadName]) {
      partnerMap[leadName].leads.push(wp.number);
    }

    // Activities
    wp.activities?.forEach(act => {
      const responsible = pipelineState.consortium.find(p => p.name === act.responsible || p.id === act.responsible)?.name || act.responsible;
      if (responsible && partnerMap[responsible]) {
        partnerMap[responsible].activities++;
      }
      act.participatingPartners?.forEach(pp => {
        const pName = pipelineState.consortium.find(p => p.name === pp || p.id === pp)?.name || pp;
        if (pName && partnerMap[pName]) {
          partnerMap[pName].activities++;
        }
      });
    });

    // Partner roles
    wp.partnerRoles?.forEach(pr => {
      if (partnerMap[pr.partner] && !partnerMap[pr.partner].leads.includes(wp.number)) {
        partnerMap[pr.partner].participates.push(wp.number);
      }
    });
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm print:shadow-none print:border-gray-300 mb-6">
      <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Partner-Beteiligung
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 print:grid-cols-4">
        {Object.entries(partnerMap).map(([name, data]) => (
          <div key={name} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
            <div className="font-medium text-xs text-gray-700 truncate" title={name}>{name}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.leads.map(n => (
                <span key={`lead-${n}`} className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">
                  WP{n} Lead
                </span>
              ))}
              {data.participates.filter(n => !data.leads.includes(n)).slice(0, 3).map(n => (
                <span key={`part-${n}`} className="px-1 py-0.5 bg-gray-200 text-gray-600 rounded text-[9px]">
                  WP{n}
                </span>
              ))}
            </div>
            <div className="text-[9px] text-gray-400 mt-1">
              {data.activities} Aktivitäten
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN OVERVIEW COMPONENT
// ============================================================================

export default function WorkPackageOverview({
  pipelineState,
  onUpdateAnswer,
  onUpdateWorkPackage,
  language,
  onClose,
}: WorkPackageOverviewProps) {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [showTimeline, setShowTimeline] = useState(true);
  const [showBudget, setShowBudget] = useState(true);
  const [showPartners, setShowPartners] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const workPackages = pipelineState.workPackages || [];
  const totalBudget = pipelineState.configuration?.totalBudget || 250000;
  const duration = pipelineState.configuration?.duration || 24;

  const toggleCard = (wpNumber: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(wpNumber)) {
        next.delete(wpNumber);
      } else {
        next.add(wpNumber);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedCards(new Set());
      setAllExpanded(false);
    } else {
      setExpandedCards(new Set(workPackages.map(wp => wp.number)));
      setAllExpanded(true);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (workPackages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Layers className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium">
          {language === 'de' ? 'Noch keine Arbeitspakete generiert' : 'No work packages generated yet'}
        </p>
        <p className="text-sm mt-1">
          {language === 'de' ? 'Generiere zuerst die Arbeitspakete in Schritt 6' : 'Generate work packages in step 6 first'}
        </p>
      </div>
    );
  }

  // Determine grid columns based on WP count
  const gridCols = workPackages.length <= 3
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    : workPackages.length <= 4
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      : workPackages.length <= 6
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div className="wp-overview-print" ref={printRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 print:mb-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            {language === 'de' ? 'Arbeitspakete-Übersicht' : 'Work Packages Overview'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {pipelineState.projectTitle || pipelineState.idea?.title || 'Projekt'}
            {pipelineState.acronym ? ` (${pipelineState.acronym})` : ''}
            {' · '}{workPackages.length} WPs · {duration} Monate · {totalBudget.toLocaleString('de-DE')}€
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${showTimeline ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <Calendar className="w-3.5 h-3.5 inline mr-1" />Timeline
          </button>
          <button
            onClick={() => setShowBudget(!showBudget)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${showBudget ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <DollarSign className="w-3.5 h-3.5 inline mr-1" />Budget
          </button>
          <button
            onClick={() => setShowPartners(!showPartners)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${showPartners ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <Users className="w-3.5 h-3.5 inline mr-1" />Partner
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <button
            onClick={toggleAll}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            {allExpanded ? <Minimize2 className="w-3.5 h-3.5 inline mr-1" /> : <Maximize2 className="w-3.5 h-3.5 inline mr-1" />}
            {allExpanded ? 'Alle zuklappen' : 'Alle aufklappen'}
          </button>
          <button
            onClick={handlePrint}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 inline mr-1" />Drucken
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      {showTimeline && <TimelineBar workPackages={workPackages} duration={duration} />}

      {/* Budget */}
      {showBudget && <BudgetOverview workPackages={workPackages} totalBudget={totalBudget} />}

      {/* Partner Summary */}
      {showPartners && <PartnerSummary pipelineState={pipelineState} workPackages={workPackages} />}

      {/* WP Cards Grid */}
      <div className={`grid ${gridCols} gap-4 print:grid-cols-2 print:gap-3`}>
        {workPackages.map((wp, idx) => {
          const wpConfig = pipelineState.wpConfigurations?.find(c => c.wpNumber === wp.number);
          return (
            <WPCard
              key={wp.number}
              wp={wp}
              wpConfig={wpConfig}
              pipelineState={pipelineState}
              onUpdateAnswer={onUpdateAnswer}
              onUpdateWorkPackage={onUpdateWorkPackage}
              wpIndex={idx}
              isExpanded={expandedCards.has(wp.number)}
              onToggleExpand={() => toggleCard(wp.number)}
              language={language}
            />
          );
        })}
      </div>

      {/* Print footer */}
      <div className="hidden print:block mt-4 pt-2 border-t border-gray-300 text-[9px] text-gray-400 text-center">
        {pipelineState.projectTitle} · Arbeitspakete-Übersicht · Generiert am {new Date().toLocaleDateString('de-DE')} · STARS Erasmus+ Architect
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          /* Hide everything except the overview */
          body * {
            visibility: hidden;
          }
          .wp-overview-print,
          .wp-overview-print * {
            visibility: visible;
          }
          .wp-overview-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10mm;
          }

          /* Landscape orientation */
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          /* Card break behavior */
          .wp-overview-print .grid > div {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Hide interactive elements */
          .print\\:hidden {
            display: none !important;
          }

          /* Adjust fonts for print */
          .wp-overview-print {
            font-size: 10px;
          }

          /* Ensure backgrounds print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
