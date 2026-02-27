"use client";

import React, { useState } from 'react';
import { Calculator, Settings, Trash2, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBudgetCalculatorStore } from '@/store/budget-calculator-store';
import { BudgetSetup } from './BudgetSetup';
import { BudgetMatrix } from './BudgetMatrix';
import { BudgetSummaryBar } from './BudgetSummaryBar';
import { BudgetExport } from './BudgetExport';
import { BudgetImport } from './BudgetImport';
import { BudgetDistribution } from './BudgetDistribution';

/**
 * Wizard phases:
 * - 'setup'        : Manual setup OR choice to import
 * - 'import'       : Select a project to import from
 * - 'distribution' : Set partner budget percentages (after import or manual setup with 2+ partners)
 * - 'matrix'       : The editable budget table
 */
type WizardPhase = 'setup' | 'import' | 'distribution' | 'matrix';

export function BudgetCalculator() {
    const store = useBudgetCalculatorStore();
    const [phase, setPhase] = useState<WizardPhase>(
        store.isSetupComplete && store.partners.length > 0 && store.workPackages.length > 0
            ? 'matrix'
            : 'setup'
    );

    const showMatrix = phase === 'matrix' && store.isSetupComplete && store.partners.length > 0 && store.workPackages.length > 0;

    const handleGoToSetup = () => {
        store.setSetupComplete(false);
        setPhase('setup');
    };

    const handleReset = () => {
        if (window.confirm('Alle Daten zuruecksetzen?')) {
            store.resetAll();
            setPhase('setup');
        }
    };

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
                <div className="flex items-center gap-2">
                    {showMatrix && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPhase('distribution')}
                                className="text-teal-600"
                            >
                                <Percent className="h-4 w-4 mr-1" />
                                Anteile
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleGoToSetup}
                                className="text-gray-500"
                            >
                                <Settings className="h-4 w-4 mr-1" />
                                Setup
                            </Button>
                        </>
                    )}
                    {(showMatrix || phase !== 'setup') && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Reset
                        </Button>
                    )}
                </div>
            </div>

            {/* Content by phase */}
            {phase === 'setup' && (
                <BudgetSetup
                    onImportClick={() => setPhase('import')}
                    onStartWithDistribution={() => {
                        // After manual setup, go to distribution if we have partners
                        if (store.partners.length >= 2) {
                            store.suggestPercentages();
                            setPhase('distribution');
                        }
                    }}
                />
            )}

            {phase === 'import' && (
                <BudgetImport
                    onImportComplete={() => {
                        // After import, go to distribution to set percentages
                        setPhase('distribution');
                    }}
                    onCancel={() => setPhase('setup')}
                />
            )}

            {phase === 'distribution' && (
                <BudgetDistribution
                    onComplete={() => setPhase('matrix')}
                    onBack={() => setPhase('setup')}
                />
            )}

            {showMatrix && (
                <>
                    <BudgetSummaryBar />
                    <BudgetMatrix />
                    <BudgetExport />
                </>
            )}
        </div>
    );
}
