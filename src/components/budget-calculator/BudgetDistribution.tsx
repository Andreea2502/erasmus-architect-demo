"use client";

import React, { useMemo } from 'react';
import { Percent, Sparkles, ArrowRight, Crown, Globe, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBudgetCalculatorStore } from '@/store/budget-calculator-store';
import { getCountryProfile, COST_GROUP_META } from '@/lib/country-cost-profiles';

/**
 * BudgetDistribution – Partner Budget-Prozent Verteilung
 *
 * Zeigt Slider/Inputs fuer jeden Partner, beruecksichtigt:
 * - Koordinator bekommt mehr (automatischer Vorschlag)
 * - Laendergruppen-Multiplikatoren werden angezeigt
 * - Summe muss 100% ergeben
 * - Smart-Verteilung per Button
 */

interface BudgetDistributionProps {
    onComplete: () => void;
    onBack: () => void;
}

export function BudgetDistribution({ onComplete, onBack }: BudgetDistributionProps) {
    const store = useBudgetCalculatorStore();
    const { partners, partnerPercentages, budgetTier } = store;

    const totalPercent = useMemo(() => {
        return partners.reduce((sum, p) => sum + (partnerPercentages[p.id] || 0), 0);
    }, [partners, partnerPercentages]);

    const isValid = Math.abs(totalPercent - 100) < 1 && partners.length >= 2;
    const diff = 100 - totalPercent;

    const handleSliderChange = (partnerId: string, value: number) => {
        store.setPartnerPercentage(partnerId, Math.round(value));
    };

    const handleInputChange = (partnerId: string, value: string) => {
        const num = parseInt(value) || 0;
        store.setPartnerPercentage(partnerId, num);
    };

    const handleSmartDistributeAndComplete = () => {
        store.smartDistribute();
        store.setSetupComplete(true);
        onComplete();
    };

    const handleManualComplete = () => {
        store.smartDistribute();
        store.setSetupComplete(true);
        onComplete();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center pb-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white mb-3">
                    <Percent className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Budget-Verteilung</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Lege fest wieviel Prozent des Budgets ({budgetTier.toLocaleString('de-DE')} EUR) jeder Partner erhaelt
                </p>
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800 space-y-1">
                    <p className="font-medium">Automatische Laenderanpassung aktiv</p>
                    <p>
                        Innerhalb der Anteile werden Personalkosten und Reisekosten automatisch an die
                        jeweilige Laendergruppe angepasst. Balkan-Partner erhalten z.B. niedrigere
                        Personalkosten-Saetze als westeuropaeische Partner.
                    </p>
                </div>
            </div>

            {/* Auto-Suggest Button */}
            <Button
                variant="outline"
                onClick={() => store.suggestPercentages()}
                className="w-full border-teal-300 text-teal-700 hover:bg-teal-50"
            >
                <Sparkles className="h-4 w-4 mr-2" />
                Prozente automatisch vorschlagen (basierend auf Laenderkosten + Koordinatorrolle)
            </Button>

            {/* Partner Sliders */}
            <Card>
                <CardContent className="pt-5 space-y-5">
                    {partners.map((partner) => {
                        const profile = getCountryProfile(partner.country);
                        const groupMeta = COST_GROUP_META[profile.group];
                        const pct = partnerPercentages[partner.id] || 0;
                        const amount = Math.round(budgetTier * pct / 100);
                        const isCoordinator = partner.role === 'coordinator';

                        return (
                            <div key={partner.id} className="space-y-2">
                                {/* Partner Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {isCoordinator && (
                                            <Crown className="h-4 w-4 text-amber-500" />
                                        )}
                                        <span className="text-sm font-medium text-gray-900">{partner.name}</span>
                                        <Badge className={`${groupMeta.bgColor} ${groupMeta.color} text-[10px] px-1.5`}>
                                            <Globe className="h-2.5 w-2.5 mr-0.5" />
                                            {partner.country} · {groupMeta.labelDE}
                                        </Badge>
                                        <span className="text-[10px] text-gray-400">
                                            Faktor: x{profile.staffMultiplier}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-gray-900">
                                            {amount.toLocaleString('de-DE')} EUR
                                        </span>
                                    </div>
                                </div>

                                {/* Slider + Input */}
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={0}
                                        max={60}
                                        step={1}
                                        value={pct}
                                        onChange={(e) => handleSliderChange(partner.id, Number(e.target.value))}
                                        className="flex-1 h-2 accent-blue-600 cursor-pointer"
                                    />
                                    <div className="flex items-center gap-1 min-w-[80px]">
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={pct}
                                            onChange={(e) => handleInputChange(partner.id, e.target.value)}
                                            className="w-14 h-8 text-center text-sm font-mono border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <span className="text-xs text-gray-500">%</span>
                                    </div>
                                </div>

                                {/* Per-category preview */}
                                <div className="flex items-center gap-4 text-[10px] text-gray-400 pl-1">
                                    <span>Personal: x{profile.staffMultiplier}</span>
                                    <span>Reise: x{profile.travelMultiplier}</span>
                                    <span>Ausstattung/Sonstiges: x1.0</span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Total */}
                    <div className={`flex items-center justify-between pt-4 border-t-2 ${
                        Math.abs(diff) < 1 ? 'border-green-300' : 'border-red-300'
                    }`}>
                        <span className="text-sm font-bold text-gray-700">Gesamt</span>
                        <div className="flex items-center gap-3">
                            <span className={`text-lg font-bold ${Math.abs(diff) < 1 ? 'text-green-600' : 'text-red-600'}`}>
                                {totalPercent}%
                            </span>
                            {Math.abs(diff) >= 1 && (
                                <span className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {diff > 0 ? `Noch ${diff}% zu verteilen` : `${Math.abs(diff)}% zu viel`}
                                </span>
                            )}
                            {Math.abs(diff) < 1 && (
                                <span className="text-xs text-green-600">Perfekt verteilt</span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* WP Preview */}
            {store.workPackages.length > 0 && (
                <Card className="bg-gray-50">
                    <CardContent className="pt-5">
                        <p className="text-xs font-semibold text-gray-600 mb-2">WP-Budget Vorschau</p>
                        <div className="space-y-1.5">
                            {store.workPackages.map(wp => {
                                const wpBudget = Math.round(budgetTier * (wp.targetPercent || 0) / 100);
                                return (
                                    <div key={wp.id} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-600">
                                            <span className="font-mono text-gray-400">WP{wp.number}</span>{' '}
                                            {wp.title}
                                        </span>
                                        <span className="font-medium text-gray-800">
                                            {wpBudget.toLocaleString('de-DE')} EUR
                                            <span className="text-gray-400 ml-1">({wp.targetPercent || 0}%)</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="text-gray-500"
                >
                    Zurueck
                </Button>
                <Button
                    onClick={handleSmartDistributeAndComplete}
                    disabled={!isValid}
                    className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Smart-Verteilung berechnen & starten
                    <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
