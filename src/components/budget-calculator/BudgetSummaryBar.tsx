"use client";

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    useBudgetCalculatorStore,
    getGrandTotal,
    getPartnerGrandTotal,
} from '@/store/budget-calculator-store';

export function BudgetSummaryBar() {
    const store = useBudgetCalculatorStore();
    const { partners, workPackages, cells, budgetTier } = store;

    const grandTotal = getGrandTotal(cells, workPackages, partners);
    const remaining = budgetTier - grandTotal;
    const pct = budgetTier > 0 ? Math.min(100, (grandTotal / budgetTier) * 100) : 0;

    const barColor = remaining === 0 ? 'bg-emerald-500' : remaining > 0 ? 'bg-blue-500' : 'bg-red-500';
    const statusColor = remaining === 0 ? 'text-emerald-700' : remaining > 0 ? 'text-blue-700' : 'text-red-700';

    return (
        <div className="bg-white rounded-xl border p-4 space-y-3">
            {/* Top row: numbers */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Budget</div>
                        <div className="text-lg font-bold text-gray-900">{budgetTier.toLocaleString('de-DE')} EUR</div>
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Zugewiesen</div>
                        <div className="text-lg font-bold text-gray-900">{grandTotal.toLocaleString('de-DE')} EUR</div>
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                            {remaining >= 0 ? 'Verbleibend' : 'Ueberschreitung'}
                        </div>
                        <div className={`text-lg font-bold ${statusColor}`}>
                            {Math.abs(remaining).toLocaleString('de-DE')} EUR
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => store.autoDistribute()}
                        className="text-blue-600"
                        title="Budget automatisch auf WPs und Partner verteilen"
                    >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Auto-Verteilen
                    </Button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                />
            </div>

            {/* Partner breakdown chips */}
            <div className="flex flex-wrap gap-2">
                {partners.map(p => {
                    const pTotal = getPartnerGrandTotal(cells, p.id, workPackages);
                    const pPct = budgetTier > 0 ? ((pTotal / budgetTier) * 100).toFixed(1) : '0';
                    return (
                        <div
                            key={p.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border text-xs"
                        >
                            <span className="font-medium text-gray-700">{p.name}</span>
                            <span className="text-gray-400">|</span>
                            <span className="tabular-nums text-gray-600">{pTotal.toLocaleString('de-DE')} EUR</span>
                            <span className="text-gray-400">({pPct}%)</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
