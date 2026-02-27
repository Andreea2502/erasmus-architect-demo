"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, XCircle } from 'lucide-react';
import {
    useBudgetCalculatorStore,
    COST_CATEGORIES,
    getCellAmount,
    getWPPartnerTotal,
    getWPTotal,
    getCategoryRowTotal,
    getPartnerGrandTotal,
    getGrandTotal,
    validateBudget,
    CostCategory,
} from '@/store/budget-calculator-store';

// ============================================================================
// EDITABLE CELL
// ============================================================================

function EditableCell({
    value,
    onChange,
}: {
    value: number;
    onChange: (val: number) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleStartEdit = () => {
        setEditValue(value > 0 ? String(value) : '');
        setIsEditing(true);
    };

    const handleSave = () => {
        const num = parseInt(editValue) || 0;
        onChange(num);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="number"
                min="0"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') setIsEditing(false);
                    if (e.key === 'Tab') {
                        handleSave();
                        // Let default Tab behavior move focus
                    }
                }}
                className="w-full h-8 text-right text-sm px-2 border border-blue-400 rounded bg-blue-50 outline-none focus:ring-2 focus:ring-blue-300"
            />
        );
    }

    return (
        <button
            onClick={handleStartEdit}
            className="w-full h-8 text-right text-sm px-2 rounded hover:bg-blue-50 transition-colors cursor-text tabular-nums"
        >
            {value > 0 ? value.toLocaleString('de-DE') : (
                <span className="text-gray-300">-</span>
            )}
        </button>
    );
}

// ============================================================================
// FORMAT HELPERS
// ============================================================================

function fmt(n: number): string {
    return n.toLocaleString('de-DE');
}

// ============================================================================
// BUDGET MATRIX TABLE
// ============================================================================

export function BudgetMatrix() {
    const store = useBudgetCalculatorStore();
    const { partners, workPackages, cells, budgetTier } = store;

    const [collapsedWPs, setCollapsedWPs] = useState<Set<string>>(new Set());

    const toggleWP = (wpId: string) => {
        setCollapsedWPs(prev => {
            const next = new Set(prev);
            if (next.has(wpId)) next.delete(wpId);
            else next.add(wpId);
            return next;
        });
    };

    const grandTotal = getGrandTotal(cells, workPackages, partners);
    const diff = budgetTier - grandTotal;
    const totalColor = diff === 0 ? 'text-emerald-700 bg-emerald-50' : diff > 0 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';

    // Validation
    const validations = validateBudget(cells, workPackages, partners, budgetTier);
    const errors = validations.filter(v => v.type === 'error');
    const warnings = validations.filter(v => v.type === 'warning');

    return (
        <div className="space-y-4">
            {/* ============================================================ */}
            {/* MATRIX TABLE                                                  */}
            {/* ============================================================ */}
            <div className="bg-white rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        {/* Header Row: Partner Names */}
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="text-left px-4 py-3 font-semibold text-gray-700 min-w-[220px] sticky left-0 bg-gray-50 z-10 border-r">
                                    Kostenkategorie
                                </th>
                                {partners.map(p => (
                                    <th key={p.id} className="text-right px-4 py-3 font-semibold text-gray-700 min-w-[130px]">
                                        <div className="text-xs font-normal text-gray-400">{p.country}</div>
                                        <div className="truncate max-w-[140px]">{p.name}</div>
                                        {p.role === 'coordinator' && (
                                            <div className="text-xs text-blue-500 font-normal">Koordinator</div>
                                        )}
                                    </th>
                                ))}
                                <th className="text-right px-4 py-3 font-bold text-gray-900 min-w-[120px] bg-gray-100 border-l">
                                    TOTAL
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {workPackages.map((wp, wpIdx) => {
                                const isCollapsed = collapsedWPs.has(wp.id);
                                const wpTotal = getWPTotal(cells, wp.id, partners);
                                const wpPct = budgetTier > 0 ? ((wpTotal / budgetTier) * 100).toFixed(1) : '0';

                                return (
                                    <React.Fragment key={wp.id}>
                                        {/* WP Header Row */}
                                        <tr
                                            className="bg-blue-50 border-y border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                                            onClick={() => toggleWP(wp.id)}
                                        >
                                            <td className="px-4 py-2 font-bold text-blue-900 sticky left-0 bg-blue-50 z-10 border-r border-blue-200">
                                                <span className="flex items-center gap-2">
                                                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    WP{wp.number}: {wp.title}
                                                </span>
                                            </td>
                                            {partners.map(p => (
                                                <td key={p.id} className="text-right px-4 py-2 font-semibold text-blue-800 tabular-nums">
                                                    {fmt(getWPPartnerTotal(cells, wp.id, p.id))}
                                                </td>
                                            ))}
                                            <td className="text-right px-4 py-2 font-bold text-blue-900 bg-blue-100 border-l border-blue-200 tabular-nums">
                                                {fmt(wpTotal)}
                                                <div className="text-xs font-normal text-blue-600">{wpPct}%</div>
                                            </td>
                                        </tr>

                                        {/* Category Rows (collapsible) */}
                                        {!isCollapsed && COST_CATEGORIES.map((cat, catIdx) => (
                                            <tr
                                                key={`${wp.id}_${cat.key}`}
                                                className={`border-b border-gray-100 ${catIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                                            >
                                                <td className={`px-4 py-1.5 text-gray-600 pl-10 sticky left-0 z-10 border-r ${catIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                    {cat.labelDE}
                                                </td>
                                                {partners.map(p => (
                                                    <td key={p.id} className="px-2 py-1">
                                                        <EditableCell
                                                            value={getCellAmount(cells, wp.id, p.id, cat.key)}
                                                            onChange={(val) => store.setCellAmount(wp.id, p.id, cat.key, val)}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="text-right px-4 py-1.5 font-medium text-gray-700 bg-gray-50 border-l tabular-nums">
                                                    {fmt(getCategoryRowTotal(cells, wp.id, cat.key, partners))}
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Separator between WPs */}
                                        {wpIdx < workPackages.length - 1 && (
                                            <tr>
                                                <td colSpan={partners.length + 2} className="h-1 bg-gray-200" />
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}

                            {/* ============================================================ */}
                            {/* GRAND TOTAL ROW                                              */}
                            {/* ============================================================ */}
                            <tr className={`border-t-2 border-gray-400 ${totalColor}`}>
                                <td className={`px-4 py-3 font-bold text-lg sticky left-0 z-10 border-r ${totalColor}`}>
                                    GESAMTBUDGET
                                </td>
                                {partners.map(p => {
                                    const pTotal = getPartnerGrandTotal(cells, p.id, workPackages);
                                    const pPct = budgetTier > 0 ? ((pTotal / budgetTier) * 100).toFixed(1) : '0';
                                    return (
                                        <td key={p.id} className="text-right px-4 py-3 font-bold tabular-nums">
                                            <div>{fmt(pTotal)}</div>
                                            <div className="text-xs font-normal opacity-70">{pPct}%</div>
                                        </td>
                                    );
                                })}
                                <td className="text-right px-4 py-3 font-bold text-lg border-l tabular-nums">
                                    <div>{fmt(grandTotal)}</div>
                                    <div className="text-xs font-normal">
                                        {diff === 0 ? 'Budget ausgeglichen' : diff > 0 ? `Rest: ${fmt(diff)}` : `Ueber: ${fmt(Math.abs(diff))}`}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ============================================================ */}
            {/* VALIDATION WARNINGS                                           */}
            {/* ============================================================ */}
            {validations.length > 0 && (
                <div className="space-y-2">
                    {errors.map((v, i) => (
                        <div key={`err_${i}`} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                            <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                            <span className="text-red-800">{v.messageDE}</span>
                        </div>
                    ))}
                    {warnings.map((v, i) => (
                        <div key={`warn_${i}`} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <span className="text-amber-800">{v.messageDE}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
