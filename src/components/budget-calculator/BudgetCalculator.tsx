"use client";

import React from 'react';
import { Calculator, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBudgetCalculatorStore } from '@/store/budget-calculator-store';
import { BudgetSetup } from './BudgetSetup';
import { BudgetMatrix } from './BudgetMatrix';
import { BudgetSummaryBar } from './BudgetSummaryBar';
import { BudgetExport } from './BudgetExport';

export function BudgetCalculator() {
    const store = useBudgetCalculatorStore();

    const showMatrix = store.isSetupComplete && store.partners.length > 0 && store.workPackages.length > 0;

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Calculator className="h-7 w-7 text-blue-600" />
                        Budget-Rechner
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Erasmus+ Lump-Sum Budgettabelle — WP x Partner x Kostenkategorie
                    </p>
                </div>
                {showMatrix && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => store.setSetupComplete(false)}
                            className="text-gray-500"
                        >
                            <Settings className="h-4 w-4 mr-1" />
                            Setup
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (window.confirm('Alle Daten zuruecksetzen?')) {
                                    store.resetAll();
                                }
                            }}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Reset
                        </Button>
                    </div>
                )}
            </div>

            {/* Content */}
            {!showMatrix ? (
                <BudgetSetup />
            ) : (
                <>
                    <BudgetSummaryBar />
                    <BudgetMatrix />
                    <BudgetExport />
                </>
            )}
        </div>
    );
}
